import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

assert.ok(html.includes("Rook's Field Companion — v0.6.2 Unified Field Edition"), "app title/version mismatch");
assert.ok(html.includes("SURVIVAL MANUAL v0.6.2"), "manual version mismatch");
assert.ok(html.includes("Version 0.6.2 • Offline reference."), "manual hero version mismatch");
assert.ok(html.includes('<link rel="manifest" href="./manifest.json">'), "manifest link must resolve to shipped manifest.json");

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
assert.match(worker, /harcom-field-companion-v0\.6\.1/);
assert.match(worker, /await cache\.addAll/);
assert.match(worker, /await cache\.put/);
assert.match(worker, /self\.clients\.claim/);

console.log("Rook's Field Companion v0.6.2 validation passed: " + ids.length + " unique IDs, " + links.length + " valid in-page links, " + diagrams.length + " inline diagrams.");
