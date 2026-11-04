/* HARCOM signed content package verifier.
 * Signatures cover the exact downloaded package bytes, not re-serialized JSON.
 * No private signing key belongs in this client-side module.
 */
(function (root) {
  "use strict";

  const MAX_PACKAGE_BYTES = 32 * 1024 * 1024;

  function error(code, message) {
    const result = new Error(message);
    result.code = code;
    throw result;
  }

  function decodeBase64(value, label) {
    if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      error("INVALID_SIGNATURE_DATA", label + " is not valid base64.");
    }
    try {
      const binary = root.atob(value);
      return Uint8Array.from(binary, character => character.charCodeAt(0));
    } catch (_) {
      error("INVALID_SIGNATURE_DATA", label + " could not be decoded.");
    }
  }

  function asBytes(input) {
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    error("INVALID_PACKAGE", "Package data must be an ArrayBuffer or typed-array view.");
  }

  function hex(bytes) {
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }

  async function verifySignedPackage(inputBytes, manifest, trustedPublicKeyBase64) {
    if (!root.crypto || !root.crypto.subtle || !root.TextDecoder) {
      error("UNSUPPORTED_CRYPTO", "This browser does not provide the cryptographic functions required to verify updates.");
    }
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      error("INVALID_MANIFEST", "The release manifest is invalid.");
    }
    if (manifest.format !== "HARCOM_KNOWLEDGE_RELEASE" ||
        manifest.manifestVersion !== 1 ||
        manifest.schemaVersion !== 1 ||
        typeof manifest.releaseId !== "string" ||
        !/^[A-Za-z0-9._-]{1,120}$/.test(manifest.releaseId) ||
        typeof manifest.createdAt !== "string" || Number.isNaN(Date.parse(manifest.createdAt)) ||
        typeof manifest.packageUrl !== "string" || !/^\\.\\/knowledge\\/releases\\/[A-Za-z0-9._-]+\\.json$/.test(manifest.packageUrl) ||
        !Number.isSafeInteger(manifest.packageSize) || manifest.packageSize < 1 || manifest.packageSize > MAX_PACKAGE_BYTES ||
        typeof manifest.packageSha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(manifest.packageSha256) ||
        typeof manifest.signature !== "string" ||
        typeof manifest.keyId !== "string" ||
        !/^[a-z0-9._-]{1,64}$/.test(manifest.keyId)) {
      error("INVALID_MANIFEST", "The release manifest is missing required fields or uses an unsupported schema.");
    }

    const bytes = asBytes(inputBytes);
    if (!bytes.byteLength || bytes.byteLength > MAX_PACKAGE_BYTES) {
      error("PACKAGE_LIMIT", "The content package is empty or exceeds the 32 MiB download limit.");
    }
    if (bytes.byteLength !== manifest.packageSize) {
      error("SIZE_MISMATCH", "The downloaded package size does not match the release manifest.");
    }

    const digest = new Uint8Array(await root.crypto.subtle.digest("SHA-256", bytes));
    const actualHash = hex(digest);
    if (actualHash !== manifest.packageSha256) {
      error("HASH_MISMATCH", "The downloaded package hash does not match the signed release manifest.");
    }

    const publicKeyBytes = decodeBase64(trustedPublicKeyBase64, "Trusted public key");
    const signatureBytes = decodeBase64(manifest.signature, "Package signature");
    if (publicKeyBytes.byteLength !== 32 || signatureBytes.byteLength !== 64) {
      error("INVALID_SIGNATURE_DATA", "Ed25519 public keys must be 32 bytes and signatures must be 64 bytes.");
    }

    let publicKey;
    try {
      publicKey = await root.crypto.subtle.importKey("raw", publicKeyBytes, { name: "Ed25519" }, false, ["verify"]);
    } catch (_) {
      error("UNSUPPORTED_SIGNATURE", "Ed25519 verification is unavailable in this browser. The update was not installed.");
    }

    let signatureValid = false;
    try {
      signatureValid = await root.crypto.subtle.verify({ name: "Ed25519" }, publicKey, signatureBytes, bytes);
    } catch (_) {
      error("SIGNATURE_CHECK_FAILED", "The package signature could not be checked. The update was not installed.");
    }
    if (!signatureValid) error("INVALID_SIGNATURE", "The package signature is invalid. The update was rejected.");

    let parsed;
    try {
      parsed = JSON.parse(new root.TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch (_) {
      error("INVALID_PACKAGE", "The signed package is not valid UTF-8 JSON.");
    }
    if (!parsed || parsed.releaseId !== manifest.releaseId || parsed.schemaVersion !== manifest.schemaVersion) {
      error("MANIFEST_MISMATCH", "The signed package does not match the release ID and schema in its manifest.");
    }
    return Object.freeze({ package: parsed, sha256: actualHash, keyId: manifest.keyId });
  }

  root.HarcomKnowledgeCrypto = Object.freeze({
    maxPackageBytes: MAX_PACKAGE_BYTES,
    verifySignedPackage
  });
})(globalThis);
