import "fake-indexeddb/auto";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync("knowledge/engine.js", "utf8");
const cryptoSource = fs.readFileSync("knowledge/crypto.js", "utf8");
Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
vm.runInThisContext(cryptoSource, { filename: "knowledge/crypto.js" });
vm.runInThisContext(source, { filename: "knowledge/engine.js" });
const db = globalThis.HarcomKnowledgeDB;
const packageVerifier = globalThis.HarcomKnowledgeCrypto;

function makePackage(releaseId, suffix = "") {
  return {
    schemaVersion: 1,
    releaseId,
    createdAt: new Date().toISOString(),
    summary: "Automated IndexedDB runtime test.",
    categories: [{ id: "water", title: "Water" }],
    sources: [{
      id: "nhs-reference",
      title: "Receiving a Boil Water Notice",
      publisher: "Drinking Water Inspectorate",
      url: "https://www.dwi.gov.uk/receiving-a-boil-water-notice/"
    }],
    articles: [{
      id: "water-safety",
      title: "Water safety basics" + suffix,
      summary: "What to do when a UK water supplier issues a boil-water notice.",
      body: "Follow the exact notice from the water supplier or local authority. A boil-water notice is different from a do-not-drink or do-not-use notice.",
      steps: ["Follow the notice exactly.", "If instructed to boil, bring water to a rolling boil before drinking or using it for food preparation.", "Cool naturally and store in a clean covered container in the fridge; follow the notice for how long it can be kept."],
      equipment: ["Kettle or suitable pan", "Clean covered storage container"],
      commonMistakes: ["Assuming boiling makes chemically contaminated water safe.", "Ignoring a do-not-use notice."],
      dangers: ["Boiling water can cause serious scalds.", "Boiling does not remove chemical contamination."],
      stopAndGetHelp: "If the notice says do not drink or do not use, use an alternative supply and contact the water supplier or local authority for instructions.",
      contentBasis: "official-guidance",
      jurisdiction: "UK-wide",
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


// Verify exact-byte Ed25519 package signing with an ephemeral test key.
const signedPackage = makePackage("signed-runtime-release");
const packageBytes = new TextEncoder().encode(JSON.stringify(signedPackage));
const keyPair = await webcrypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const rawPublicKey = new Uint8Array(await webcrypto.subtle.exportKey("raw", keyPair.publicKey));
const signature = new Uint8Array(await webcrypto.subtle.sign({ name: "Ed25519" }, keyPair.privateKey, packageBytes));
const toBase64 = bytes => Buffer.from(bytes).toString("base64");
const hashBytes = new Uint8Array(await webcrypto.subtle.digest("SHA-256", packageBytes));
const hashHex = Array.from(hashBytes, value => value.toString(16).padStart(2, "0")).join("");
const signedManifest = {
  schemaVersion: 1,
  releaseId: signedPackage.releaseId,
  packageSha256: hashHex,
  signature: toBase64(signature),
  keyId: "ephemeral-test-key"
};
const verified = await packageVerifier.verifySignedPackage(packageBytes, signedManifest, toBase64(rawPublicKey));
assert.equal(verified.package.releaseId, signedPackage.releaseId);
assert.equal(verified.sha256, hashHex);
const changedBytes = new Uint8Array(packageBytes);
changedBytes[0] ^= 1;
await assert.rejects(
  () => packageVerifier.verifySignedPackage(changedBytes, signedManifest, toBase64(rawPublicKey)),
  error => error.code === "HASH_MISMATCH"
);
const invalidSignatureManifest = { ...signedManifest, signature: toBase64(new Uint8Array(64)) };
await assert.rejects(
  () => packageVerifier.verifySignedPackage(packageBytes, invalidSignatureManifest, toBase64(rawPublicKey)),
  error => error.code === "INVALID_SIGNATURE"
);
await assert.rejects(
  () => packageVerifier.verifySignedPackage(packageBytes, { ...signedManifest, releaseId: "wrong-id" }, toBase64(rawPublicKey)),
  error => error.code === "MANIFEST_MISMATCH"
);

console.log("HARCOM Knowledge Engine runtime tests passed: IndexedDB validation, staging, search, rollback, retention, quota fail-closed and Ed25519 package verification.");
