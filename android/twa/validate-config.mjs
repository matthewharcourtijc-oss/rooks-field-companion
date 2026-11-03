import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const configPath = new URL("./twa-manifest.json", import.meta.url);
const config = JSON.parse(readFileSync(configPath, "utf8"));

assert.equal(config.host, "matthewharcourtijc-oss.github.io");
assert.equal(config.startUrl, "/rooks-field-companion/");
assert.equal(config.packageId, "com.harcomindustries.fieldcompanion");
assert.equal(config.display, "standalone");
assert.equal(config.orientation, "portrait");
assert.equal(config.enableNotifications, false);
assert.equal(config.fallbackType, "customtabs");
assert.equal(config.webManifestUrl, "https://matthewharcourtijc-oss.github.io/rooks-field-companion/manifest.json");
assert.match(config.iconUrl, /icon-512\.png$/);
assert.equal(config.signingKey.alias, "harcom-field-companion");
assert.ok(Array.isArray(config.fingerprints));
assert.equal(config.fingerprints.length, 0, "Do not invent a signing fingerprint before the dedicated key exists.");
assert.equal(existsSync(new URL("./field-companion-release.keystore", import.meta.url)), false,
  "A private release keystore must not be committed.");

console.log("Companion TWA configuration checks passed.");
