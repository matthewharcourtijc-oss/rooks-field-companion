import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const host = "127.0.0.1";
const port = 4173;
const baseUrl = `http://${host}:${port}/`;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", host], {
  stdio: "ignore"
});
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (_) {
      // The local server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("The local test server did not start.");
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // UI clicks do not await async save handlers. Wait for the persisted state
  // after each write so this regression setup tests sequential user actions,
  // not overlapping commits caused by the test runner moving between tabs.
  async function waitForRecordCounts(expected) {
    await page.waitForFunction(({ tasks, notes, logs }) => {
      try {
        const data = JSON.parse(localStorage.getItem("harcom_data"));
        return data && data.tasks.length === tasks &&
          data.notes.length === notes && data.logs.length === logs;
      } catch (_) {
        return false;
      }
    }, expected, { timeout: 10000 });
  }

  // Real-browser regression: preserve existing Tasks, Notes, Mission Log and backup/restore.
  // This runs on a fresh 127.0.0.1 origin, never against the live GitHub Pages origin.
  await page.waitForFunction(() => {
    const status = document.getElementById("lastTest");
    return status && status.textContent.startsWith("Persistence test:");
  }, null, { timeout: 15000 });

  await page.locator("#taskInput").fill("PR25 regression task A");
  await page.locator("#addTask").click();
  await waitForRecordCounts({ tasks: 1, notes: 0, logs: 0 });
  await page.locator('[data-tab="notes"]').click();
  await page.locator("#noteTitle").fill("PR25 regression note A");
  await page.locator("#noteText").fill("Note A must survive Library use and restore.");
  await page.locator("#addNote").click();
  await waitForRecordCounts({ tasks: 1, notes: 1, logs: 0 });
  await page.locator('[data-tab="log"]').click();
  await page.locator("#logInput").fill("PR25 regression log A");
  await page.locator("#addLog").click();
  await waitForRecordCounts({ tasks: 1, notes: 1, logs: 1 });

  const backupA = await page.evaluate(() => getExport());
  await page.locator('[data-tab="tasks"]').click();
  await page.locator("#taskInput").fill("PR25 regression task B");
  await page.locator("#addTask").click();
  await waitForRecordCounts({ tasks: 2, notes: 1, logs: 1 });
  await page.locator('[data-tab="notes"]').click();
  await page.locator("#noteTitle").fill("PR25 regression note B");
  await page.locator("#noteText").fill("Note B is the post-backup state.");
  await page.locator("#addNote").click();
  await waitForRecordCounts({ tasks: 2, notes: 2, logs: 1 });
  await page.locator('[data-tab="log"]').click();
  await page.locator("#logInput").fill("PR25 regression log B");
  await page.locator("#addLog").click();
  await waitForRecordCounts({ tasks: 2, notes: 2, logs: 2 });

  const snapshotB = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return { tasks: data.tasks, notes: data.notes, logs: data.logs };
  });
  assert.equal(snapshotB.tasks.length, 2, "Tasks regression setup should save both tasks");
  assert.equal(snapshotB.notes.length, 2, "Notes regression setup should save both notes");
  assert.equal(snapshotB.logs.length, 2, "Mission Log regression setup should save both entries");

  await page.locator('[data-tab="backup"]').click();
  await page.locator("#importArea").fill(JSON.stringify(backupA));
  await page.locator("#validateBtn").click();
  await page.waitForFunction(() => document.getElementById("importStatus").textContent.includes("Backup looks good"));
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#importBtn").click();
  await page.waitForFunction(() => document.getElementById("importStatus").textContent.includes("Import complete"));
  const restoredA = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return { tasks: data.tasks, notes: data.notes, logs: data.logs };
  });
  assert.deepEqual(restoredA, { tasks: backupA.tasks, notes: backupA.notes, logs: backupA.logs },
    "backup import should restore the exact earlier Tasks, Notes and Mission Log records");

  const safetyRestore = page.locator("#safetyList .safety-item button").filter({ hasText: "Restore" }).first();
  await safetyRestore.waitFor({ state: "visible" });
  page.once("dialog", dialog => dialog.accept());
  await safetyRestore.click();
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return data.tasks.length === 2 && data.notes.length === 2 && data.logs.length === 2;
  });
  const restoredB = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return { tasks: data.tasks, notes: data.notes, logs: data.logs };
  });
  assert.deepEqual(restoredB, snapshotB,
    "restoring the automatic safety copy should recover the post-backup records exactly");

  await page.locator('[data-tab="library"]').click();
  await page.waitForFunction(() => {
    const status = document.getElementById("knowledgeStatus");
    return status && status.textContent.includes("OFFLINE READY");
  }, null, { timeout: 15000 });

  const personalAfterLibrary = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return { tasks: data.tasks, notes: data.notes, logs: data.logs };
  });
  assert.deepEqual(personalAfterLibrary, snapshotB,
    "installing and opening the offline library must not alter Tasks, Notes or Mission Log");

  const initial = await page.evaluate(async () => {
    const release = await window.HarcomKnowledgeDB.getActiveRelease();
    const categories = await window.HarcomKnowledgeDB.listCategories();
    const articles = await window.HarcomKnowledgeDB.listArticles({ limit: 100 });
    return {
      release: release && release.id,
      articleCount: articles.length,
      categoryCount: categories.length,
      databaseName: window.HarcomKnowledgeDB.name
    };
  });
  assert.equal(initial.articleCount, 48, "browser should install all 48 bundled articles");
  assert.equal(initial.categoryCount, 18, "browser should install all 18 categories");
  assert.equal(initial.databaseName, "harcom-field-knowledge");
  assert.equal(await page.locator("#knowledgeCategories button").count(), 18);

  await page.locator("#knowledgeSearch").fill("coastal tide");
  const coastalResult = page.locator("#knowledgeResults button").first();
  await coastalResult.waitFor({ state: "visible" });
  await coastalResult.click();
  await page.locator("#knowledgeArticle").waitFor({ state: "visible" });
  const coastalArticleText = await page.locator("#knowledgeArticleContent").innerText();
  assert.match(coastalArticleText, /Coastguard/i, "coastal/tide search should open the Coastguard safety article");
  assert.ok(await page.locator("#knowledgeArticleContent a").count() > 0, "article sources should render as links");
  await page.locator("#knowledgeBack").click();

  await page.locator("#knowledgeSearch").fill("severe bleeding");
  const bleedingResult = page.locator("#knowledgeResults button").filter({ hasText: /severe bleeding/i }).first();
  await bleedingResult.waitFor({ state: "visible" });
  await bleedingResult.click();
  const illustration = page.locator("#knowledgeArticleContent img");
  await illustration.waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const image = document.querySelector("#knowledgeArticleContent img");
    return image && image.complete && image.naturalWidth > 0 && !!image.alt;
  });
  const imageInfo = await illustration.evaluate(image => ({ alt: image.alt, width: image.naturalWidth }));

  const workerInfo = await page.evaluate(async () => {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Service worker did not become ready within 10 seconds; inspect its install/cache errors.")), 10000))
    ]);
    const cacheNames = await caches.keys();
    const cache = await caches.open("harcom-field-companion-v0.9.15");
    const keys = await cache.keys();
    return {
      controlled: !!navigator.serviceWorker.controller,
      scope: registration.scope,
      cacheNames,
      cachedUrls: keys.map(request => new URL(request.url).pathname)
    };
  });
  assert.ok(workerInfo.controlled, "page must be controlled by the service worker before offline testing");
  assert.ok(workerInfo.cacheNames.includes("harcom-field-companion-v0.9.15"));
  for (const path of [
    "/index.html",
    "/knowledge/content/uk-core-v1.json",
    "/knowledge/engine.js",
    "/knowledge/ui.js",
    "/knowledge/illustrations/bleeding-pressure.svg",
    "/knowledge/illustrations/tree-identification.svg",
    "/knowledge/illustrations/foraging-checks.svg",
    "/knowledge/illustrations/tarp-a-frame.svg",
    "/knowledge/illustrations/camp-knots.svg",
    "/knowledge/illustrations/fire-safety.svg",
    "/knowledge/illustrations/water-treatment.svg"
  ]) {
    assert.ok(workerInfo.cachedUrls.some(url => url.endsWith(path)), `offline cache is missing ${path}`);
  }

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
  await page.locator('[data-tab="library"]').click();
  await page.waitForFunction(() => {
    const status = document.getElementById("knowledgeStatus");
    return status && status.textContent.includes("OFFLINE READY");
  }, null, { timeout: 15000 });

  const offlineRelease = await page.evaluate(async () => {
    const release = await window.HarcomKnowledgeDB.getActiveRelease();
    return release && release.id;
  });
  assert.equal(offlineRelease, initial.release, "offline reload must retain the active IndexedDB release");
  const personalAfterOfflineReload = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("harcom_data"));
    return { tasks: data.tasks, notes: data.notes, logs: data.logs };
  });
  assert.deepEqual(personalAfterOfflineReload, snapshotB,
    "offline reload must preserve Tasks, Notes and Mission Log byte-for-byte at the record level");

  await page.locator("#knowledgeSearch").fill("handwashing");
  const handwashing = page.locator("#knowledgeResults button").filter({ hasText: /hand hygiene/i }).first();
  await handwashing.waitFor({ state: "visible" });
  await handwashing.click();
  await page.locator("#knowledgeArticle").waitFor({ state: "visible" });
  assert.match(await page.locator("#knowledgeArticleContent").innerText(), /hand/i);
  await page.locator("#knowledgeBack").click();
  await page.locator("#knowledgeSearch").fill("severe bleeding");
  const offlineBleeding = page.locator("#knowledgeResults button").filter({ hasText: /severe bleeding/i }).first();
  await offlineBleeding.waitFor({ state: "visible" });
  await offlineBleeding.click();
  await page.locator("#knowledgeArticle").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const image = document.querySelector("#knowledgeArticleContent img");
    return image && image.complete && image.naturalWidth > 0;
  }, null, { timeout: 10000 });
  assert.deepEqual(pageErrors, [], "browser runtime must not throw uncaught page errors");

  console.log(JSON.stringify({
    result: "PASS",
    articleCount: initial.articleCount,
    categoryCount: initial.categoryCount,
    database: initial.databaseName,
    illustration: imageInfo,
    serviceWorkerControlled: workerInfo.controlled,
    precachedAssetsChecked: 11,
    offlineReload: "PASS",
    offlineSearchAndArticleRead: "PASS",
    uncaughtPageErrors: pageErrors.length
  }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
