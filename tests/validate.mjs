import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const readme = fs.readFileSync("README.md", "utf8");

assert.ok(html.includes("Field Companion | HARCOM Industries"), "app title/brand mismatch");
assert.ok(readme.includes("v0.9.5 — HARCOM Ownership & Provenance"), "README release version is stale");
assert.ok(html.includes('id="harcom-identity-v094"'), "HARCOM visual identity layer missing");
assert.ok(html.includes("<h1>FIELD COMPANION</h1>"), "clean product title missing");
assert.ok(readme.includes("fully offline manual search"), "README missing manual search feature");
assert.ok(manifest.name.includes("HARCOM Industries"), "manifest brand name is stale");
assert.ok(html.includes("FIELD MANUAL"), "manual brand footer missing");
assert.ok(html.includes("INDEPENDENCE THROUGH KNOWLEDGE • OFFLINE READY"), "consumer-facing product descriptor missing");
assert.ok(html.includes("HARCOM INDUSTRIES"), "prominent consumer brand missing");
assert.ok(html.includes('data-owner="HARCOM Industries"'), "machine-readable owner identity missing");
assert.ok(html.includes('name="author" content="HARCOM Industries"'), "author metadata missing");
assert.ok(html.includes("© 2026 HARCOM INDUSTRIES. ALL RIGHTS RESERVED."), "visible ownership notice missing");
assert.ok(html.includes('id="harcom-ownership-v095"'), "ownership styling missing");
assert.ok(manifest.name.includes("HARCOM Industries"), "install identity missing");
assert.equal(manifest.short_name, "HARCOM Field");
assert.ok(readme.includes("Ownership and permissions"), "README ownership section missing");
assert.ok(html.includes("FIELD READY"), "consumer-facing field-ready label missing");
assert.ok(!html.includes("single atomic key harcom_data"), "developer storage diagnostics leaked into consumer counts");
assert.ok(!html.includes("Backup manually verified:"), "developer-style backup status leaked into consumer UI");
assert.ok(html.includes('<link rel="manifest" href="./manifest.json">'), "manifest link must resolve to shipped manifest.json");

assert.ok(html.includes('id="manualSearch"'), "offline manual search control missing");
assert.ok(html.includes("Offline field-manual search: local index"), "manual search must remain local/offline");
assert.ok(html.includes("BUILD A SIMPLE GRAVITY PRE-FILTER"), "water filter build guide missing");
assert.ok(html.includes("COMMERCIAL TOURNIQUET — LIMB PLACEMENT"), "tourniquet visual missing");
assert.ok(html.includes("all-topic offline cross-navigation"), "cross-topic navigation missing");
assert.ok(html.includes("THE RESPONSE LOOP"), "field response visual missing");
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
assert.ok(manifest.name.includes("Field Companion"));
assert.ok(fs.existsSync("icon.svg"), "manifest icon file is missing");
const icon = fs.readFileSync("icon.svg", "utf8");
assert.ok(icon.includes("viewBox=\"0 0 512 512\"") && icon.includes("#f08a36") && icon.includes("#bcecff"), "HARCOM shield/compass icon palette or dimensions missing");
assert.ok(html.includes('<link rel="icon" type="image/svg+xml" href="./icon.svg">'), "browser favicon missing");
assert.ok(manifest.icons.some(item => item.src === "./icon.svg" && item.type === "image/svg+xml"), "installed app icon missing");
assert.match(html, /serviceWorker\.register/);
assert.match(worker, /harcom-field-companion-v0\.9\.6/);
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
const searchResults = { children: [], hidden: true, replaceChildren() { this.children = []; }, appendChild(node) { this.children.push(node); } };
const searchClear = { addEventListener(type, callback) { this[type] = callback; } };
const created = [];
const searchSections = [
  { id: "water", textContent: "Water purification and safe storage", hidden: false, querySelector() { return { textContent: "Water purification" }; }, scrollIntoView() {} },
  { id: "shelter", textContent: "Shelter site selection and insulation", hidden: false, querySelector() { return { textContent: "Shelter" }; }, scrollIntoView() {} }
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
    if (id === "manualSearchResults") return searchResults;
    if (id === "clearManualSearch") return searchClear;
    return null;
  },
  querySelector(selector) {
    return selector === "#guide .manual-content" ? searchManual : null;
  },
  createElement(tag) { const node = { tag, children: [], append(...items) { this.children.push(...items); }, addEventListener(type, callback) { this[type] = callback; } }; created.push(node); return node; }
};
const searchScript = scripts.find(match => match[1].includes("Offline field-manual search: local index"));
assert.ok(searchScript, "offline manual search script missing");
vm.runInNewContext(searchScript[1], { document: searchDocument, history: { replaceState() {} }, setTimeout() {} });
assert.equal(searchCount.textContent, "Search 2 field topics", "search initial topic count incorrect");
searchInput.value = "water";
searchInput.listeners.input();
assert.equal(searchSections[0].hidden, false, "matching section was hidden");
assert.equal(searchSections[1].hidden, true, "non-matching section remained visible");
assert.equal(searchLinks[0].hidden, false, "matching TOC link was hidden");
assert.equal(searchLinks[1].hidden, true, "non-matching TOC link remained visible");
assert.equal(searchCount.textContent, "1 matching topic", "matching result count incorrect");
assert.equal(searchResults.children.length, 1, "matching search result not rendered");
searchInput.value = "no-such-topic";
searchInput.listeners.input();
assert.equal(searchCount.textContent, "0 matching topics", "zero-result count incorrect");
searchInput.listeners.keydown({ key: "Escape" });
assert.equal(searchInput.value, "", "Escape did not clear the search");
assert.equal(searchSections.every(section => !section.hidden), true, "Escape did not restore all sections");
assert.equal(searchInput.blurred, true, "Escape did not return focus from search");
assert.equal(searchCount.textContent, "Search 2 field topics", "Escape did not reset search count");

console.log("HARCOM Field Companion v0.9.5 validation passed: " + ids.length + " unique IDs, " + links.length + " valid in-page links, " + diagrams.length + " inline diagrams.");
