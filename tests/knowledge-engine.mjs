import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const engine = fs.readFileSync("knowledge/engine.js", "utf8");
const crypto = fs.readFileSync("knowledge/crypto.js", "utf8");
const harness = fs.readFileSync("tests/knowledge-engine.html", "utf8");
new vm.Script(engine, { filename: "knowledge/engine.js" });
new vm.Script(crypto, { filename: "knowledge/crypto.js" });

assert.ok(crypto.includes("verifySignedPackage"));
assert.ok(crypto.includes("SHA-256"));
assert.ok(crypto.includes("Ed25519"));
assert.ok(crypto.includes("HASH_MISMATCH"));
assert.ok(crypto.includes("SIZE_MISMATCH"));
assert.ok(crypto.includes("manifest.packageSize"));
assert.ok(crypto.includes("INVALID_SIGNATURE"));
assert.ok(!crypto.includes("privateKey"));
assert.ok(engine.includes('const DB_NAME = "harcom-field-knowledge"'));
assert.ok(engine.includes('const DB_VERSION = 2'));
assert.ok(engine.includes('root.HarcomKnowledgeDB = Object.freeze'));
assert.ok(engine.includes('keyPath: ["releaseId", "id"]'));
assert.ok(engine.includes('searchTerms: "searchTerms"'));
assert.ok(engine.includes('byReleaseTerm'));
assert.ok(engine.includes('matched.size === terms.length'));
assert.ok(engine.includes('async function activateRelease(releaseId)'));
assert.ok(engine.includes('settings.put({ key: "activeRelease"'));
assert.ok(engine.includes('requestPersistentStorage'));
assert.ok(engine.includes('durability: "strict"'));
assert.ok(engine.includes('QUOTA_RISK'));
assert.ok(engine.includes('UNSUPPORTED_SCHEMA'));
assert.ok(engine.includes('MISSING_REFERENCE'));
assert.ok(engine.includes('DUPLICATE_ID'));
assert.ok(engine.includes('READBACK_FAILED'));
assert.ok(engine.includes('ACTIVE_RELEASE'));
assert.ok(!engine.includes("localStorage.") && !engine.includes("sessionStorage.") && !/harcom_data|rooks_tasks|rooks_notes|rooks_logs/.test(engine),
  "knowledge engine must not access the existing personal-data stores");
assert.ok(harness.includes('../knowledge/engine.js'));
assert.ok(harness.includes('Run database tests'));
assert.ok(harness.includes('unsupported schema rejection'));
assert.ok(harness.includes('missing source rejection'));
assert.ok(harness.includes('offline indexed multi-word search'));
assert.ok(harness.includes('search requires every query term'));
assert.ok(harness.includes('rollback to previous release'));

console.log("HARCOM Knowledge Engine structural tests passed.");
