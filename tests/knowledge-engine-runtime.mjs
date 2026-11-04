import "fake-indexeddb/auto";
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

const source = fs.readFileSync("knowledge/engine.js", "utf8");
const cryptoSource = fs.readFileSync("knowledge/crypto.js", "utf8");
const updaterSource = fs.readFileSync("knowledge/updater.js", "utf8");
Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
vm.runInThisContext(cryptoSource, { filename: "knowledge/crypto.js" });
vm.runInThisContext(source, { filename: "knowledge/engine.js" });
vm.runInThisContext(updaterSource, { filename: "knowledge/updater.js" });
const db = globalThis.HarcomKnowledgeDB;
const packageVerifier = globalThis.HarcomKnowledgeCrypto;
const updater = globalThis.HarcomKnowledgeUpdater;

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
  format: "HARCOM_KNOWLEDGE_RELEASE",
  manifestVersion: 1,
  schemaVersion: 1,
  packageSize: packageBytes.byteLength,
  releaseId: signedPackage.releaseId,
  createdAt: signedPackage.createdAt,
  packageUrl: "./knowledge/releases/runtime-test.json",
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
await assert.rejects(
  () => packageVerifier.verifySignedPackage(packageBytes, { ...signedManifest, packageSize: packageBytes.byteLength + 1 }, toBase64(rawPublicKey)),
  error => error.code === "SIZE_MISMATCH"
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
await assert.rejects(
  () => packageVerifier.verifySignedPackage(packageBytes, { ...signedManifest, packageUrl: "https://attacker.invalid/package.json" }, toBase64(rawPublicKey)),
  error => error.code === "INVALID_MANIFEST"
);


const ukPack = JSON.parse(fs.readFileSync("knowledge/content/uk-core-v1.json", "utf8"));
assert.equal(ukPack.articles.length, 13, "starter library article count changed");
assert.equal(db.validatePackage(ukPack).articles.length, 13, "UK starter library must satisfy the content schema");
await db.installRelease(ukPack);
assert.equal((await db.getActiveRelease()).id, ukPack.releaseId);
assert.equal((await db.listArticles()).length, 13);
assert.equal((await db.listArticles({ categoryId: "first-aid" })).length, 3);
const floodArticle = await db.getArticle("flood-warning-actions");
const floodSources = await db.getSourcesForArticle("flood-warning-actions");
assert.equal(floodSources.length, 1);
assert.equal(floodSources[0].publisher, "GOV.UK");
const floodResults = await db.search("flood warning");
console.log("Flood search result IDs:", floodResults.map(article => article.id));
assert.ok(floodResults.some(article => article.id === "flood-warning-actions"));
assert.ok(floodResults.every(article => [article.title, article.summary, article.body, ...(article.tags || []), ...(article.steps || []), ...(article.equipment || []), ...(article.commonMistakes || []), ...(article.dangers || []), article.stopAndGetHelp].join(" ").toLowerCase().includes("flood") && [article.title, article.summary, article.body, ...(article.tags || []), ...(article.steps || []), ...(article.equipment || []), ...(article.commonMistakes || []), ...(article.dangers || []), article.stopAndGetHelp].join(" ").toLowerCase().includes("warning")));
const hypothermiaResults = await db.search("hypothermia");
assert.ok(hypothermiaResults.some(article => article.id === "hypothermia-recognition-response"));
assert.equal((await db.search("tent fire")).length, 1);


const networkPackage = makePackage("network-update-1");
networkPackage.createdAt = "2026-11-05T00:00:00.000Z";
const networkBytes = new TextEncoder().encode(JSON.stringify(networkPackage));
const networkSignature = new Uint8Array(await webcrypto.subtle.sign({ name: "Ed25519" }, keyPair.privateKey, networkBytes));
const networkHashBytes = new Uint8Array(await webcrypto.subtle.digest("SHA-256", networkBytes));
const networkHash = Array.from(networkHashBytes, value => value.toString(16).padStart(2, "0")).join("");
const networkManifest = {
  format: "HARCOM_KNOWLEDGE_RELEASE",
  manifestVersion: 1,
  schemaVersion: 1,
  packageSize: networkBytes.byteLength,
  releaseId: networkPackage.releaseId,
  createdAt: networkPackage.createdAt,
  packageUrl: "./knowledge/releases/network-update-1.json",
  packageSha256: networkHash,
  signature: toBase64(networkSignature),
  keyId: "ephemeral-test-key"
};
const fetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
let activeManifest = networkManifest;
let activePackageBytes = networkBytes;
let activePackagePath = "/field-app/knowledge/releases/network-update-1.json";
Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: async url => {
    const target = String(url);
    if (target.endsWith("/knowledge/release.json")) {
      return new Response(JSON.stringify(activeManifest), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (target.endsWith(activePackagePath)) {
      return new Response(activePackageBytes, { status: 200, headers: { "content-length": String(activePackageBytes.byteLength) } });
    }
    throw new Error("Unexpected test URL: " + target);
  }
});
try {
  const trustedKeys = { "ephemeral-test-key": toBase64(rawPublicKey) };
  await assert.rejects(
    () => updater.checkForUpdates({ manifestUrl: "https://attacker.invalid/knowledge/release.json", trustedOrigin: "https://example.test", trustedKeys }),
    error => error.code === "INVALID_URL"
  );
  const checked = await updater.checkForUpdates({ manifestUrl: "https://example.test/field-app/knowledge/release.json", trustedOrigin: "https://example.test", trustedKeys });
  assert.equal(checked.status, "update-available");
  const updateResult = await updater.installUpdate({ checked, trustedKeys });
  assert.equal(updateResult.status, "installed");
  assert.equal((await db.getActiveRelease()).id, networkPackage.releaseId);
  const unchanged = await updater.checkForUpdates({ manifestUrl: "https://example.test/knowledge/release.json", trustedOrigin: "https://example.test", trustedKeys });
  assert.equal(unchanged.status, "current");
  const badPackage = makePackage("network-update-2");
  badPackage.createdAt = "2026-11-06T00:00:00.000Z";
  activePackageBytes = new TextEncoder().encode(JSON.stringify(badPackage));
  activePackagePath = "/field-app/knowledge/releases/network-update-2.json";
  const badHash = new Uint8Array(await webcrypto.subtle.digest("SHA-256", activePackageBytes));
  activeManifest = {
    format: "HARCOM_KNOWLEDGE_RELEASE", manifestVersion: 1, schemaVersion: 1,
    packageSize: activePackageBytes.byteLength, releaseId: badPackage.releaseId, createdAt: badPackage.createdAt,
    packageUrl: "./knowledge/releases/network-update-2.json",
    packageSha256: Array.from(badHash, value => value.toString(16).padStart(2, "0")).join(""),
    signature: toBase64(new Uint8Array(64)), keyId: "ephemeral-test-key"
  };
  const badCheck = await updater.checkForUpdates({ manifestUrl: "https://example.test/knowledge/release.json", trustedOrigin: "https://example.test", trustedKeys });
  await assert.rejects(() => updater.installUpdate({ checked: badCheck, trustedKeys }), error => error.code === "INVALID_SIGNATURE");
  assert.equal((await db.getActiveRelease()).id, networkPackage.releaseId, "invalid signed update must leave the active release untouched");
} finally {
  if (fetchDescriptor) Object.defineProperty(globalThis, "fetch", fetchDescriptor);
  else delete globalThis.fetch;
}

console.log("HARCOM Knowledge Engine runtime tests passed: IndexedDB validation, staging, search, rollback, retention, quota fail-closed Ed25519 package verification and signed update installation.");
