import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const engine = fs.readFileSync("knowledge/engine.js", "utf8");
const crypto = fs.readFileSync("knowledge/crypto.js", "utf8");
const updater = fs.readFileSync("knowledge/updater.js", "utf8");
const ui = fs.readFileSync("knowledge/ui.js", "utf8");
const ukPack = JSON.parse(fs.readFileSync("knowledge/content/uk-core-v1.json", "utf8"));
const manifestSchema = JSON.parse(fs.readFileSync("knowledge/release-manifest.schema.json", "utf8"));
const harness = fs.readFileSync("tests/knowledge-engine.html", "utf8");
new vm.Script(engine, { filename: "knowledge/engine.js" });
new vm.Script(crypto, { filename: "knowledge/crypto.js" });
new vm.Script(updater, { filename: "knowledge/updater.js" });
new vm.Script(ui, { filename: "knowledge/ui.js" });

assert.equal(manifestSchema.properties.manifestVersion.const, 1);
assert.equal(manifestSchema.properties.format.const, "HARCOM_KNOWLEDGE_RELEASE");
assert.ok(manifestSchema.required.includes("packageSha256"));
assert.ok(manifestSchema.required.includes("signature"));
assert.ok(ui.includes("ensureSeedLibrary"));
assert.ok(ui.includes("getSourcesForArticle"));
assert.ok(!ui.includes("innerHTML"), "knowledge article content must be rendered with text nodes");
assert.ok(updater.includes("checkForUpdates"));
assert.ok(updater.includes("installUpdate"));
assert.ok(updater.includes("redirect: \"error\""));
assert.ok(updater.includes("credentials: \"omit\""));
assert.ok(updater.includes("NETWORK_ERROR"));
assert.ok(updater.includes("DOWNGRADE_BLOCKED"));
assert.ok(crypto.includes("verifySignedPackage"));
assert.ok(crypto.includes("SHA-256"));
assert.ok(crypto.includes("Ed25519"));
assert.ok(crypto.includes("HASH_MISMATCH"));
assert.ok(crypto.includes("SIZE_MISMATCH"));
assert.ok(crypto.includes("manifest.packageSize"));
assert.ok(crypto.includes("INVALID_SIGNATURE"));
assert.ok(!crypto.includes("privateKey"));
assert.ok(ukPack.articles.length >= 31, "UK starter content pack must contain at least 31 articles");
assert.ok(ukPack.articles.length >= 48, "expanded field library must contain at least 48 articles");
for (const categoryId of ["forestry", "foraging", "bushcraft"]) {
  assert.ok(ukPack.categories.some(category => category.id === categoryId), "missing expanded category: " + categoryId);
}
for (const article of ukPack.articles.filter(item => item.illustration)) {
  assert.match(article.illustration, /^\.\/knowledge\/illustrations\/[a-z0-9-]+\.svg$/);
  assert.ok(article.illustrationAlt && article.illustrationAlt.length >= 12, "illustrated articles need useful alt text");
  assert.ok(fs.existsSync(article.illustration.slice(2)), "offline illustration is missing: " + article.illustration);
}
assert.ok(ui.includes("knowledge-illustration"), "article UI must render offline illustrations");
assert.ok(ui.includes("image.alt"), "offline illustrations must have alt text");
assert.ok(ukPack.sources.length >= 49, "expanded field library must retain at least 49 named sources");
assert.ok(ukPack.articles.every(article => article.sourceIds.length && article.reviewedAt && article.stopAndGetHelp && article.contentBasis), "every article must carry provenance, review and safety fields");
assert.ok(engine.includes("getSourcesForArticle"));
assert.ok(engine.includes('const DB_NAME = root.HARCOM_KNOWLEDGE_DB_NAME || "harcom-field-knowledge"'));
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
