import "fake-indexeddb/auto";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync("knowledge/engine.js", "utf8");
vm.runInThisContext(source, { filename: "knowledge/engine.js" });
const db = globalThis.HarcomKnowledgeDB;

function makePackage(releaseId, suffix = "") {
  return {
    schemaVersion: 1,
    releaseId,
    createdAt: new Date().toISOString(),
    summary: "Automated IndexedDB runtime test.",
    categories: [{ id: "water", title: "Water" }],
    sources: [{
      id: "nhs-reference",
      title: "NHS poisoning guidance",
      publisher: "NHS",
      url: "https://www.nhs.uk/conditions/poisoning/"
    }],
    articles: [{
      id: "water-safety",
      title: "Water safety basics" + suffix,
      summary: "Choosing safe water",
      body: "Clear water is not necessarily safe. Use a suitable treatment method.",
      categoryId: "water",
      tags: ["water", "safety"],
      sourceIds: ["nhs-reference"],
      reviewedAt: new Date().toISOString(),
      safetyLevel: "caution"
    }],
    media: []
  };
}

assert.equal(db.name, "harcom-field-knowledge");
assert.equal(db.schemaVersion, 2);
assert.equal(await db.getActiveRelease(), null, "database should start without an active release");

assert.throws(() => db.validatePackage({ ...makePackage("bad-schema"), schemaVersion: 77 }),
  error => error.code === "UNSUPPORTED_SCHEMA");
assert.throws(() => db.validatePackage({
  ...makePackage("bad-source"),
  articles: [{ ...makePackage("bad-source").articles[0], sourceIds: ["missing"] }]
}), error => error.code === "MISSING_REFERENCE");
const duplicate = makePackage("duplicate");
duplicate.articles.push({ ...duplicate.articles[0] });
assert.throws(() => db.validatePackage(duplicate), error => error.code === "DUPLICATE_ID");

const first = makePackage("runtime-release-1");
const installedFirst = await db.installRelease(first);
assert.equal(installedFirst.ok, true);
assert.equal((await db.getActiveRelease()).id, first.releaseId);
assert.equal((await db.getArticle("water-safety")).title, "Water safety basics");
assert.equal((await db.listCategories()).length, 1);
assert.equal((await db.search("water safety")).length, 1);
assert.equal((await db.search("water unicorn")).length, 0, "search must require every term");
assert.equal((await db.search("water", { categoryId: "missing" })).length, 0);

const second = makePackage("runtime-release-2", " updated");
await db.installRelease(second);
assert.equal((await db.getActiveRelease()).id, second.releaseId);
assert.equal((await db.getRelease(first.releaseId)).status, "previous");
assert.equal((await db.search("updated")).length, 1);

await db.activateRelease(first.releaseId);
assert.equal((await db.getActiveRelease()).id, first.releaseId, "rollback should restore previous release");
assert.equal((await db.getRelease(second.releaseId)).status, "previous");
await assert.rejects(() => db.discardRelease(first.releaseId), error => error.code === "ACTIVE_RELEASE");
assert.equal(await db.discardRelease(second.releaseId), true);
assert.equal(await db.getRelease(second.releaseId), null);

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { storage: { estimate: async () => ({ quota: 1000, usage: 900 }) } }
});
try {
  await assert.rejects(() => db.installRelease(makePackage("quota-fail")),
    error => error.code === "QUOTA_RISK");
  assert.equal((await db.getActiveRelease()).id, first.releaseId,
    "quota failure must not change the active release");
} finally {
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
}

console.log("HARCOM Knowledge Engine IndexedDB runtime tests passed: validation, staging, search, rollback, retention and quota fail-closed.");
