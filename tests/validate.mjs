import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

assert.match(html, /Rook's Field Companion — v0\.5\.1 Unified Field Edition/);
for (const id of ["tasks", "notes", "log", "guide", "backup", "priorities", "trauma", "firstaid", "shelter", "fire", "water", "navigation", "rescue"]) {
  assert.match(html, new RegExp('\\bid="' + id + '"'), "missing required panel or manual section: " + id);
}

const ids = [...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, "duplicate HTML id detected");

const idSet = new Set(ids);
for (const [, target] of html.matchAll(/href=["']#([^"']+)["']/g)) {
  assert.ok(idSet.has(target), "broken in-page link: #" + target);
}

const scripts = [...html.matchAll(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/g)];
assert.ok(scripts.length >= 2, "expected embedded application scripts");
scripts.forEach((match, index) => new vm.Script(match[1], { filename: "index-inline-" + index + ".js" }));
new vm.Script(worker, { filename: "service-worker.js" });

assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.ok(manifest.name.includes("Rook's Field Companion"));
assert.ok(fs.existsSync("icon.svg"), "manifest icon file is missing");
assert.match(html, /serviceWorker\\.register/);
assert.match(html, /SURVIVAL MANUAL v0\\.5\\.1/);
assert.match(worker, /await cache\\.put/);
assert.match(worker, /harcom-field-companion-v0\\.5\\.1/);
assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i, "remote scripts break offline-first operation");
assert.doesNotMatch(html, /fonts\\.googleapis\\.com/i, "hosted fonts break offline-first operation");

console.log("Rook's Field Companion v0.5.1 validation passed.");
