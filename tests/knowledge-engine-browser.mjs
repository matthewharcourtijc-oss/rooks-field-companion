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
  await page.locator('[data-tab="library"]').click();
  await page.waitForFunction(() => {
    const status = document.getElementById("knowledgeStatus");
    return status && status.textContent.includes("OFFLINE READY");
  }, null, { timeout: 15000 });

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
  const coastalResult = page.locator("#knowledgeResults button").filter({ hasText: /coastal tide/i }).first();
  await coastalResult.waitFor({ state: "visible" });
  await coastalResult.click();
  await page.locator("#knowledgeArticle").waitFor({ state: "visible" });
  assert.match(await page.locator("#knowledgeArticleContent").innerText(), /coastal tide/i);
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
