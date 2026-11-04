/* HARCOM offline knowledge updater.
 * Network access is used only for an explicit update check/install.
 * Installed content remains local and readable without connectivity.
 */
(function (root) {
  "use strict";

  const MAX_PACKAGE_BYTES = 32 * 1024 * 1024;

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function checkedHttpsUrl(value, baseOrigin) {
    let url;
    try { url = new URL(value, baseOrigin || undefined); }
    catch (_) { fail("INVALID_URL", "The update address is invalid."); }
    if (url.protocol !== "https:" || (baseOrigin && url.origin !== baseOrigin)) {
      fail("INVALID_URL", "Updates must come from the same HTTPS site as Field Companion.");
    }
    return url;
  }

  function validPackagePath(value) {
    const prefix = "./knowledge/releases/";
    if (typeof value !== "string" || !value.startsWith(prefix) || !value.endsWith(".json")) return false;
    const filename = value.slice(prefix.length, -5);
    return !!filename && /^[A-Za-z0-9._-]+$/.test(filename);
  }

  function validateManifest(manifest) {
    if (!manifest || manifest.format !== "HARCOM_KNOWLEDGE_RELEASE" ||
        manifest.manifestVersion !== 1 || manifest.schemaVersion !== 1 ||
        typeof manifest.releaseId !== "string" ||
        !/^[A-Za-z0-9._-]{1,120}$/.test(manifest.releaseId) ||
        typeof manifest.createdAt !== "string" || Number.isNaN(Date.parse(manifest.createdAt)) ||
        !validPackagePath(manifest.packageUrl) ||
        !Number.isSafeInteger(manifest.packageSize) ||
        manifest.packageSize < 1 || manifest.packageSize > MAX_PACKAGE_BYTES ||
        typeof manifest.packageSha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.packageSha256) ||
        typeof manifest.keyId !== "string" || !/^[a-z0-9._-]{1,64}$/.test(manifest.keyId) ||
        typeof manifest.signature !== "string") {
      fail("INVALID_MANIFEST", "The update manifest is incomplete or invalid.");
    }
    return manifest;
  }

  async function readLimited(response, expectedSize) {
    const header = response.headers && response.headers.get("content-length");
    if (header !== null && header !== undefined && header !== "") {
      const advertised = Number(header);
      if (!Number.isSafeInteger(advertised) || advertised !== expectedSize) {
        fail("SIZE_MISMATCH", "The package download size does not match the release manifest.");
      }
    }
    if (!response.body || !response.body.getReader) {
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== expectedSize || buffer.byteLength > MAX_PACKAGE_BYTES) {
        fail("SIZE_MISMATCH", "The package download size does not match the release manifest.");
      }
      return new Uint8Array(buffer);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        total += part.value.byteLength;
        if (total > expectedSize || total > MAX_PACKAGE_BYTES) {
          await reader.cancel().catch(() => {});
          fail("PACKAGE_LIMIT", "The package download exceeded its declared size limit.");
        }
        chunks.push(part.value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    }
    if (total !== expectedSize) fail("SIZE_MISMATCH", "The package download was incomplete.");
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return result;
  }

  async function fetchManifest(manifestUrl, trustedOrigin) {
    if (!root.fetch) fail("UNSUPPORTED", "This browser cannot check for updates.");
    const origin = trustedOrigin || (root.location && root.location.origin);
    if (!origin) fail("INVALID_URL", "The trusted Field Companion site origin is not available.");
    const url = checkedHttpsUrl(manifestUrl, origin);
    let response;
    try {
      response = await root.fetch(url.href, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        headers: { "Accept": "application/json" }
      });
    } catch (_) {
      fail("NETWORK_ERROR", "Could not reach the update service. Your installed library remains available.");
    }
    if (!response.ok) fail("MANIFEST_FETCH_FAILED", "The update service did not return a valid release manifest.");
    if (response.url) checkedHttpsUrl(response.url, url.origin);
    let manifest;
    try {
      const manifestText = await response.text();
      if (manifestText.length > 65536) fail("INVALID_MANIFEST", "The update manifest exceeds the 64 KiB size limit.");
      manifest = JSON.parse(manifestText);
    } catch (error) {
      if (error && error.code) throw error;
      fail("INVALID_MANIFEST", "The update manifest was not valid JSON.");
    }
    return { manifest: validateManifest(manifest), origin: url.origin };
  }

  async function checkForUpdates(options) {
    const opts = options || {};
    const { manifest, origin } = await fetchManifest(opts.manifestUrl, opts.trustedOrigin);
    const current = await root.HarcomKnowledgeDB.getActiveRelease();
    if (current && current.id === manifest.releaseId) {
      return { status: "current", current, manifest };
    }
    if (current && Date.parse(manifest.createdAt) <= Date.parse(current.createdAt)) {
      fail("DOWNGRADE_BLOCKED", "The available release is not newer than the installed library.");
    }
    const publicKey = opts.trustedKeys && opts.trustedKeys[manifest.keyId];
    if (!publicKey) fail("UNKNOWN_SIGNING_KEY", "This release was signed with an untrusted key. It was not installed.");
    return { status: "update-available", current, manifest, origin };
  }

  async function installUpdate(options) {
    const opts = options || {};
    const checked = opts.checked || await checkForUpdates(opts);
    if (checked.status === "current") return { status: "current", release: checked.current };
    const manifest = checked.manifest;
    const origin = checked.origin || new URL(opts.manifestUrl).origin;
    const publicKey = opts.trustedKeys && opts.trustedKeys[manifest.keyId];
    if (!publicKey) fail("UNKNOWN_SIGNING_KEY", "This release was signed with an untrusted key. It was not installed.");
    const packageUrl = checkedHttpsUrl(manifest.packageUrl, origin);
    let response;
    try {
      response = await root.fetch(packageUrl.href, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        headers: { "Accept": "application/json" }
      });
    } catch (_) {
      fail("NETWORK_ERROR", "The content package could not be downloaded. Your current library remains active.");
    }
    if (!response.ok) fail("PACKAGE_FETCH_FAILED", "The content package could not be downloaded. Your current library remains active.");
    if (response.url) checkedHttpsUrl(response.url, origin);
    const bytes = await readLimited(response, manifest.packageSize);
    const verified = await root.HarcomKnowledgeCrypto.verifySignedPackage(bytes, manifest, publicKey);
    if (verified.package.createdAt !== manifest.createdAt) {
      fail("MANIFEST_MISMATCH", "The package creation date does not match the signed release manifest.");
    }
    const installed = await root.HarcomKnowledgeDB.installRelease(verified.package);
    return { status: "installed", release: installed.release, verified: { sha256: verified.sha256, keyId: verified.keyId } };
  }

  root.HarcomKnowledgeUpdater = Object.freeze({
    checkForUpdates,
    installUpdate,
    validateManifest
  });
})(globalThis);
