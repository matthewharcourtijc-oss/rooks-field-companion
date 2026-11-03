import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");

assert.ok(html.includes("Rook's Field Companion — v0.7.0 Clean Field Edition"), "app title/version mismatch");
assert.ok(readme.includes("v0.7.0 — Clean offline field system"), "README release version is stale");
assert.ok(readme.includes("fully offline manual search"), "README missing manual search feature");
assert.ok(manifest.name.includes("Clean Field Edition"), "manifest app name is stale");
assert.ok(html.includes("SURVIVAL MANUAL v0.7.0"), "manual version mismatch");
assert.ok(html.includes("Version 0.7.0 • Offline reference."), "manual hero version mismatch");
assert.ok(html.includes('<link rel="manifest" href="./manifest.json">'), "manifest link must resolve to shipped manifest.json");

assert.ok(html.includes('id="manualSearch"'), "offline manual search control missing");
assert.ok(html.includes("Offline manual search: local text only"), "manual search must remain local/offline");
assert.match(html, /addEventListener\('input',update\)/, "manual search input handler missing");
assert.ok(html.includes('id="manualSearchCount"'), "manual search result status missing");

const requiredIds = [
  "tasks", "notes", "log", "guide", "backup",
  "priorities", "fieldcraft", "trauma", "remote-care", "firstaid",
  "shelter", "fire", "water", "sanitation", "food", "fungi",
  "navigation", "weather", "rescue", "kit",
  "campcraft", "knots", "firecraft", "watercraft",
  "navigation-practice", "field-tools", "camp-systems", "signalling"
];
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
const idSet = new Set(ids);
for (const id of requiredIds) {
  assert.ok(idSet.has(id), "missing required panel or manual section: " + id);
}
assert.equal(ids.length, idSet.size, "duplicate HTML id detected");

const links = [...html.matchAll(/href=["']#([^"']+)["']/g)].map(match => match[1]);
for (const target of links) {
  assert.ok(idSet.has(target), "broken in-page link: #" + target);
}
for (const id of requiredIds.slice(5)) {
  assert.ok(html.includes('<a href="#' + id + '">'), "manual table of contents missing: #" + id);
}

const diagrams = [...html.matchAll(/<svg\b/g)];
assert.ok(diagrams.length >= 18, "expected at least 18 embedded SVG diagrams; found " + diagrams.length);
assert.ok(!/<img[^>]+src=["']https?:/i.test(html), "remote images break full offline manual");
assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i, "remote scripts break offline-first operation");
assert.doesNotMatch(html, /fonts\.googleapis\.com/i, "hosted fonts break offline-first operation");

const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
assert.ok(scripts.length >= 2, "expected embedded application scripts");
scripts.forEach((match, index) => new vm.Script(match[1], { filename: "index-inline-" + index + ".js" }));
new vm.Script(worker, { filename: "service-worker.js" });

assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.ok(manifest.name.includes("Rook's Field Companion"));
assert.ok(fs.existsSync("icon.svg"), "manifest icon file is missing");
assert.match(html, /serviceWorker\.register/);
assert.match(worker, /harcom-field-companion-v0\.7\.0/);
assert.match(worker, /await cache\.addAll/);
assert.match(worker, /await cache\.put/);
assert.match(worker, /self\.clients\.claim/);


// Exercise offline search behaviour with a small DOM test double.
const searchInput = {
  value: "",
  listeners: {},
  blurred: false,
  addEventListener(type, callback) { this.listeners[type] = callback; },
  blur() { this.blurred = true; }
};
const searchCount = { textContent: "" };
const searchSections = [
  { id: "water", textContent: "Water purification and safe storage", hidden: false },
  { id: "shelter", textContent: "Shelter site selection and insulation", hidden: false }
];
const searchLinks = [
  { getAttribute() { return "#water"; }, hidden: false },
  { getAttribute() { return "#shelter"; }, hidden: false }
];
const searchManual = {
  querySelectorAll(selector) {
    if (selector === "section[id]") return searchSections;
    if (selector === '.toc a[href^="#"]') return searchLinks;
    return [];
  }
};
const searchDocument = {
  getElementById(id) {
    if (id === "manualSearch") return searchInput;
    if (id === "manualSearchCount") return searchCount;
    return null;
  },
  querySelector(selector) {
    return selector === "#guide .manual-content" ? searchManual : null;
  }
};
const searchScript = scripts.find(match => match[1].includes("Offline manual search: local text only"));
assert.ok(searchScript, "offline manual search script missing");
vm.runInNewContext(searchScript[1], { document: searchDocument });
assert.equal(searchCount.textContent, "2 topics", "search initial topic count incorrect");
searchInput.value = "water";
searchInput.listeners.input();
assert.equal(searchSections[0].hidden, false, "matching section was hidden");
assert.equal(searchSections[1].hidden, true, "non-matching section remained visible");
assert.equal(searchLinks[0].hidden, false, "matching TOC link was hidden");
assert.equal(searchLinks[1].hidden, true, "non-matching TOC link remained visible");
assert.equal(searchCount.textContent, "1 of 2 topics", "matching result count incorrect");
searchInput.value = "no-such-topic";
searchInput.listeners.input();
assert.equal(searchCount.textContent, "0 of 2 topics", "zero-result count incorrect");
searchInput.listeners.keydown({ key: "Escape" });
assert.equal(searchInput.value, "", "Escape did not clear the search");
assert.equal(searchSections.every(section => !section.hidden), true, "Escape did not restore all sections");
assert.equal(searchInput.blurred, true, "Escape did not return focus from search");

console.log("Rook's Field Companion v0.7.0 validation passed: " + ids.length + " unique IDs, " + links.length + " valid in-page links, " + diagrams.length + " inline diagrams.");
