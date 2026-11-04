/* HARCOM Offline Knowledge Engine — isolated local content database.
 * This module deliberately does not read or write localStorage or personal records.
 * Copyright 2026 HARCOM Industries.
 */
(function (root) {
  "use strict";

  const DB_NAME = "harcom-field-knowledge";
  const DB_VERSION = 1;
  const STORES = Object.freeze({
    articles: "articles",
    categories: "categories",
    sources: "sources",
    media: "media",
    releases: "releases",
    settings: "settings"
  });
  const LIMITS = Object.freeze({
    articles: 10000,
    categories: 500,
    sources: 5000,
    media: 2000,
    articleText: 100000,
    title: 180,
    id: 120
  });
  const SAFETY_LEVELS = new Set(["info", "caution", "high"]);

  function fail(code, message) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }

  function validId(value, label) {
    if (typeof value !== "string" || !value.trim() || value.length > LIMITS.id) {
      fail("INVALID_RECORD", label + " must be a non-empty string no longer than " + LIMITS.id + " characters.");
    }
    return value.trim();
  }

  function arrayOf(value, label, max) {
    if (!Array.isArray(value) || value.length > max) {
      fail("INVALID_PACKAGE", label + " must be an array containing no more than " + max + " records.");
    }
    return value;
  }

  function validatePackage(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      fail("INVALID_PACKAGE", "The knowledge package must be an object.");
    }
    if (input.schemaVersion !== 1) {
      fail("UNSUPPORTED_SCHEMA", "This knowledge package uses an unsupported schema version.");
    }
    const releaseId = validId(input.releaseId, "releaseId");
    if (!/^[a-zA-Z0-9._-]+$/.test(releaseId)) {
      fail("INVALID_RECORD", "releaseId may contain only letters, numbers, dots, underscores and hyphens.");
    }
    const categories = arrayOf(input.categories, "categories", LIMITS.categories);
    const sources = arrayOf(input.sources, "sources", LIMITS.sources);
    const articles = arrayOf(input.articles, "articles", LIMITS.articles);
    const media = arrayOf(input.media || [], "media", LIMITS.media);

    const categoryIds = new Set();
    const sourceIds = new Set();
    const articleIds = new Set();
    const mediaIds = new Set();

    categories.forEach((item, index) => {
      if (!item || typeof item !== "object") fail("INVALID_RECORD", "Category " + index + " is invalid.");
      const id = validId(item.id, "Category id");
      if (categoryIds.has(id)) fail("DUPLICATE_ID", "Duplicate category id: " + id);
      categoryIds.add(id);
      if (typeof item.title !== "string" || !item.title.trim() || item.title.length > LIMITS.title) {
        fail("INVALID_RECORD", "Category " + id + " has an invalid title.");
      }
    });

    sources.forEach((item, index) => {
      if (!item || typeof item !== "object") fail("INVALID_RECORD", "Source " + index + " is invalid.");
      const id = validId(item.id, "Source id");
      if (sourceIds.has(id)) fail("DUPLICATE_ID", "Duplicate source id: " + id);
      sourceIds.add(id);
      if (typeof item.title !== "string" || !item.title.trim() || item.title.length > LIMITS.title * 2) {
        fail("INVALID_RECORD", "Source " + id + " has an invalid title.");
      }
      if (typeof item.publisher !== "string" || !item.publisher.trim()) {
        fail("INVALID_RECORD", "Source " + id + " is missing its publisher.");
      }
      if (typeof item.url !== "string" || !/^https:\/\//i.test(item.url)) {
        fail("INVALID_RECORD", "Source " + id + " must have an HTTPS reference URL.");
      }
    });

    articles.forEach((item, index) => {
      if (!item || typeof item !== "object") fail("INVALID_RECORD", "Article " + index + " is invalid.");
      const id = validId(item.id, "Article id");
      if (articleIds.has(id)) fail("DUPLICATE_ID", "Duplicate article id: " + id);
      articleIds.add(id);
      if (typeof item.title !== "string" || !item.title.trim() || item.title.length > LIMITS.title) {
        fail("INVALID_RECORD", "Article " + id + " has an invalid title.");
      }
      if (typeof item.body !== "string" || !item.body.trim() || item.body.length > LIMITS.articleText) {
        fail("INVALID_RECORD", "Article " + id + " has invalid or oversized body text.");
      }
      if (!categoryIds.has(item.categoryId)) fail("MISSING_REFERENCE", "Article " + id + " refers to a missing category.");
      if (!Array.isArray(item.sourceIds) || item.sourceIds.length === 0) {
        fail("MISSING_REFERENCE", "Article " + id + " must cite at least one source.");
      }
      item.sourceIds.forEach(sourceId => {
        if (!sourceIds.has(sourceId)) fail("MISSING_REFERENCE", "Article " + id + " refers to missing source " + sourceId + ".");
      });
      if (!Array.isArray(item.tags) || item.tags.length > 40 || item.tags.some(tag => typeof tag !== "string" || tag.length > 50)) {
        fail("INVALID_RECORD", "Article " + id + " has invalid tags.");
      }
      if (!SAFETY_LEVELS.has(item.safetyLevel)) {
        fail("INVALID_RECORD", "Article " + id + " must declare safetyLevel as info, caution or high.");
      }
      if (typeof item.reviewedAt !== "string" || Number.isNaN(Date.parse(item.reviewedAt))) {
        fail("INVALID_RECORD", "Article " + id + " must include a valid reviewedAt date.");
      }
    });

    media.forEach((item, index) => {
      if (!item || typeof item !== "object") fail("INVALID_RECORD", "Media item " + index + " is invalid.");
      const id = validId(item.id, "Media id");
      if (mediaIds.has(id)) fail("DUPLICATE_ID", "Duplicate media id: " + id);
      mediaIds.add(id);
      if (!(item.data instanceof Blob) && !(item.data instanceof ArrayBuffer)) {
        fail("INVALID_RECORD", "Media item " + id + " must contain a Blob or ArrayBuffer.");
      }
      if (item.data.size > 8 * 1024 * 1024 || item.data.byteLength > 8 * 1024 * 1024) {
        fail("PACKAGE_LIMIT", "Media item " + id + " exceeds the 8 MiB per-item limit.");
      }
    });

    return {
      schemaVersion: 1,
      releaseId,
      createdAt: typeof input.createdAt === "string" && !Number.isNaN(Date.parse(input.createdAt))
        ? input.createdAt : new Date().toISOString(),
      summary: typeof input.summary === "string" ? input.summary.slice(0, 1000) : "",
      categories, sources, articles, media
    };
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error("Database transaction was aborted."));
      transaction.onerror = () => reject(transaction.error || new Error("Database transaction failed."));
    });
  }

  function makeTransaction(db, names, mode) {
    if (mode === "readwrite") {
      try {
        return db.transaction(names, mode, { durability: "strict" });
      } catch (_) {
        return db.transaction(names, mode);
      }
    }
    return db.transaction(names, mode);
  }

  function openDatabase() {
    if (!root.indexedDB) return Promise.reject(Object.assign(new Error("This browser does not support IndexedDB."), { code: "UNSUPPORTED" }));
    return new Promise((resolve, reject) => {
      const request = root.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = event => {
        const db = event.target.result;
        const tx = event.target.transaction;
        if (!db.objectStoreNames.contains(STORES.articles)) {
          const store = db.createObjectStore(STORES.articles, { keyPath: ["releaseId", "id"] });
          store.createIndex("byRelease", "releaseId", { unique: false });
          store.createIndex("byCategory", ["releaseId", "categoryId"], { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.categories)) {
          const store = db.createObjectStore(STORES.categories, { keyPath: ["releaseId", "id"] });
          store.createIndex("byRelease", "releaseId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.sources)) {
          const store = db.createObjectStore(STORES.sources, { keyPath: ["releaseId", "id"] });
          store.createIndex("byRelease", "releaseId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.media)) {
          const store = db.createObjectStore(STORES.media, { keyPath: ["releaseId", "id"] });
          store.createIndex("byRelease", "releaseId", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.releases)) {
          db.createObjectStore(STORES.releases, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: "key" });
        }
      };
      request.onblocked = () => reject(Object.assign(new Error("The knowledge database is busy in another open app tab. Close other Field Companion tabs and retry."), { code: "BLOCKED" }));
      request.onerror = () => reject(request.error || new Error("Could not open the knowledge database."));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        db.onclose = () => {};
        resolve(db);
      };
    });
  }

  async function withDatabase(callback) {
    const db = await openDatabase();
    try {
      return await callback(db);
    } finally {
      db.close();
    }
  }

  async function getActiveRelease() {
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.settings, STORES.releases], "readonly");
      const done = transactionDone(tx);
      const pointer = await requestResult(tx.objectStore(STORES.settings).get("activeRelease"));
      if (!pointer || !pointer.value) {
        await done;
        return null;
      }
      const release = await requestResult(tx.objectStore(STORES.releases).get(pointer.value));
      await done;
      return release || null;
    });
  }

  async function installRelease(input) {
    const pkg = validatePackage(input);
    const existing = await getRelease(pkg.releaseId);
    if (existing) fail("RELEASE_EXISTS", "That content release is already installed. Use a new unique release ID.");
    const estimate = root.navigator && root.navigator.storage && root.navigator.storage.estimate
      ? await root.navigator.storage.estimate().catch(() => null) : null;
    if (estimate && Number.isFinite(estimate.quota) && Number.isFinite(estimate.usage)) {
      const approximateBytes = JSON.stringify({
        categories: pkg.categories, sources: pkg.sources, articles: pkg.articles
      }).length * 2;
      const remaining = Math.max(0, estimate.quota - estimate.usage);
      if (approximateBytes > remaining * 0.8) {
        fail("QUOTA_RISK", "There may not be enough browser storage for this update. The active library has not been changed.");
      }
    }

    const releaseRecord = {
      id: pkg.releaseId,
      schemaVersion: pkg.schemaVersion,
      createdAt: pkg.createdAt,
      installedAt: new Date().toISOString(),
      summary: pkg.summary,
      counts: {
        categories: pkg.categories.length,
        sources: pkg.sources.length,
        articles: pkg.articles.length,
        media: pkg.media.length
      },
      status: "staged"
    };

    await withDatabase(async db => {
      const names = [STORES.articles, STORES.categories, STORES.sources, STORES.media, STORES.releases];
      const tx = makeTransaction(db, names, "readwrite");
      const done = transactionDone(tx);
      const stores = {
        articles: tx.objectStore(STORES.articles),
        categories: tx.objectStore(STORES.categories),
        sources: tx.objectStore(STORES.sources),
        media: tx.objectStore(STORES.media)
      };
      try {
        stores.categories.add(...[]);
      } catch (_) {}
      pkg.categories.forEach(item => stores.categories.add({ ...item, releaseId: pkg.releaseId }));
      pkg.sources.forEach(item => stores.sources.add({ ...item, releaseId: pkg.releaseId }));
      pkg.articles.forEach(item => stores.articles.add({ ...item, releaseId: pkg.releaseId }));
      pkg.media.forEach(item => stores.media.add({ ...item, releaseId: pkg.releaseId }));
      tx.objectStore(STORES.releases).add(releaseRecord);
      await done;
    });

    const verified = await verifyStagedRelease(pkg.releaseId);
    if (!verified.ok) {
      await discardRelease(pkg.releaseId).catch(() => {});
      fail("READBACK_FAILED", "The downloaded library did not pass read-back verification. The previous active library remains in place.");
    }

    await withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.settings, STORES.releases], "readwrite");
      const done = transactionDone(tx);
      const releases = tx.objectStore(STORES.releases);
      const settings = tx.objectStore(STORES.settings);
      const release = await requestResult(releases.get(pkg.releaseId));
      if (!release || release.status !== "staged") {
        tx.abort();
        fail("ACTIVATION_FAILED", "The staged release could not be confirmed. The previous library remains active.");
      }
      release.status = "active";
      release.activatedAt = new Date().toISOString();
      releases.put(release);
      settings.put({ key: "activeRelease", value: pkg.releaseId, updatedAt: new Date().toISOString() });
      await done;
    });

    return { ok: true, release: await getActiveRelease(), verified };
  }

  async function getRelease(releaseId) {
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.releases], "readonly");
      const done = transactionDone(tx);
      const result = await requestResult(tx.objectStore(STORES.releases).get(releaseId));
      await done;
      return result || null;
    });
  }

  async function verifyStagedRelease(releaseId) {
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.articles, STORES.categories, STORES.sources, STORES.media, STORES.releases], "readonly");
      const done = transactionDone(tx);
      const [release, articles, categories, sources, media] = await Promise.all([
        requestResult(tx.objectStore(STORES.releases).get(releaseId)),
        requestResult(tx.objectStore(STORES.articles).index("byRelease").getAll(releaseId)),
        requestResult(tx.objectStore(STORES.categories).index("byRelease").getAll(releaseId)),
        requestResult(tx.objectStore(STORES.sources).index("byRelease").getAll(releaseId)),
        requestResult(tx.objectStore(STORES.media).index("byRelease").getAll(releaseId))
      ]);
      await done;
      if (!release || release.status !== "staged") return { ok: false, reason: "missing-staged-release" };
      const counts = { articles: articles.length, categories: categories.length, sources: sources.length, media: media.length };
      const expected = release.counts;
      const ok = Object.keys(counts).every(key => counts[key] === expected[key]);
      return { ok, counts, expected, reason: ok ? null : "record-count-mismatch" };
    });
  }

  async function discardRelease(releaseId) {
    validId(releaseId, "releaseId");
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.articles, STORES.categories, STORES.sources, STORES.media, STORES.releases, STORES.settings], "readwrite");
      const done = transactionDone(tx);
      const active = await requestResult(tx.objectStore(STORES.settings).get("activeRelease"));
      if (active && active.value === releaseId) {
        tx.abort();
        fail("ACTIVE_RELEASE", "The active knowledge release cannot be discarded.");
      }
      const release = await requestResult(tx.objectStore(STORES.releases).get(releaseId));
      if (!release) {
        await done;
        return false;
      }
      const names = [STORES.articles, STORES.categories, STORES.sources, STORES.media];
      names.forEach(name => {
        const store = tx.objectStore(name);
        const request = store.index("byRelease").openKeyCursor(IDBKeyRange.only(releaseId));
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          }
        };
      });
      tx.objectStore(STORES.releases).delete(releaseId);
      await done;
      return true;
    });
  }

  async function listCategories() {
    const active = await getActiveRelease();
    if (!active) return [];
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.categories], "readonly");
      const done = transactionDone(tx);
      const items = await requestResult(tx.objectStore(STORES.categories).index("byRelease").getAll(active.id));
      await done;
      return items.sort((a, b) => a.title.localeCompare(b.title));
    });
  }

  async function getArticle(articleId) {
    validId(articleId, "articleId");
    const active = await getActiveRelease();
    if (!active) return null;
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.articles], "readonly");
      const done = transactionDone(tx);
      const article = await requestResult(tx.objectStore(STORES.articles).get([active.id, articleId]));
      await done;
      return article || null;
    });
  }

  async function search(query, options) {
    const term = String(query || "").trim().toLocaleLowerCase();
    if (!term) return [];
    const active = await getActiveRelease();
    if (!active) return [];
    const opts = options || {};
    const categoryId = opts.categoryId || null;
    const limit = Math.max(1, Math.min(Number(opts.limit) || 30, 100));
    return withDatabase(async db => {
      const tx = makeTransaction(db, [STORES.articles], "readonly");
      const done = transactionDone(tx);
      const index = tx.objectStore(STORES.articles).index(categoryId ? "byCategory" : "byRelease");
      const records = await requestResult(index.getAll(categoryId ? [active.id, categoryId] : active.id));
      await done;
      const terms = term.split(/\s+/).filter(Boolean);
      return records.map(article => {
        const haystack = [article.title, article.summary || "", article.body, ...(article.tags || [])].join(" ").toLocaleLowerCase();
        const score = terms.reduce((sum, word) => sum + (haystack.includes(word) ? (article.title.toLocaleLowerCase().includes(word) ? 4 : 1) : 0), 0);
        return { article, score };
      }).filter(item => item.score === terms.length + (terms.length ? item.score - terms.length : 0) && item.score > 0)
        .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title))
        .slice(0, limit).map(item => item.article);
    });
  }

  async function storageStatus() {
    const storage = root.navigator && root.navigator.storage;
    if (!storage || !storage.estimate) return { supported: false, persistent: false, usage: null, quota: null };
    const [estimate, persistent] = await Promise.all([
      storage.estimate().catch(() => null),
      storage.persisted ? storage.persisted().catch(() => false) : Promise.resolve(false)
    ]);
    return {
      supported: true,
      persistent,
      usage: estimate && Number.isFinite(estimate.usage) ? estimate.usage : null,
      quota: estimate && Number.isFinite(estimate.quota) ? estimate.quota : null
    };
  }

  async function requestPersistentStorage() {
    const storage = root.navigator && root.navigator.storage;
    if (!storage || !storage.persist) return { supported: false, granted: false };
    const granted = await storage.persist().catch(() => false);
    return { supported: true, granted: !!granted };
  }

  root.HarcomKnowledgeDB = Object.freeze({
    name: DB_NAME,
    schemaVersion: DB_VERSION,
    validatePackage,
    installRelease,
    getActiveRelease,
    getRelease,
    verifyStagedRelease,
    discardRelease,
    listCategories,
    getArticle,
    search,
    storageStatus,
    requestPersistentStorage
  });
})(globalThis);
