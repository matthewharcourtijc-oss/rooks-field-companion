/* HARCOM Offline Knowledge Library interface.
 * All article content is rendered as text nodes; no article HTML is executed.
 */
(function () {
  "use strict";

  const DB = window.HarcomKnowledgeDB;
  const Crypto = window.HarcomKnowledgeCrypto;
  const Updater = window.HarcomKnowledgeUpdater;
  const byId = id => document.getElementById(id);

  const status = byId("knowledgeStatus");
  const categoriesHost = byId("knowledgeCategories");
  const resultsHost = byId("knowledgeResults");
  const articleHost = byId("knowledgeArticle");
  const articleContent = byId("knowledgeArticleContent");
  const searchInput = byId("knowledgeSearch");
  const updateButton = byId("knowledgeCheckUpdates");
  const updateNote = byId("knowledgeUpdateNote");
  if (!DB || !status || !categoriesHost || !resultsHost || !articleHost || !articleContent || !searchInput) return;

  let activeRelease = null;
  let activeCategory = null;
  let currentArticle = null;
  let ready = false;

  const trustedKeys = window.HARCOM_KNOWLEDGE_TRUSTED_KEYS || {};
  const manifestUrl = new URL("./knowledge/release.json", location.href).href;

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || "neutral";
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function addTextSection(parent, title, entries, ordered) {
    if (!Array.isArray(entries) || !entries.length) return;
    const section = node("section", "knowledge-article-section");
    section.appendChild(node("h3", "", title));
    const list = node(ordered ? "ol" : "ul");
    entries.forEach(entry => list.appendChild(node("li", "", entry)));
    section.appendChild(list);
    parent.appendChild(section);
  }

  async function ensureSeedLibrary() {
    let active = await DB.getActiveRelease();
    let seed;
    try {
      const response = await fetch("./knowledge/content/uk-core-v1.json");
      if (!response.ok) throw new Error("The bundled offline knowledge pack could not be read.");
      seed = await response.json();
    } catch (error) {
      if (active) return active;
      throw error;
    }

    if (!active || Date.parse(seed.createdAt) > Date.parse(active.createdAt)) {
      try {
        const existing = await DB.getRelease(seed.releaseId);
        if (existing) {
          const verification = await DB.verifyStagedRelease(seed.releaseId);
          if (!verification.ok) throw new Error("The bundled library did not pass its local integrity checks.");
          await DB.activateRelease(seed.releaseId);
        } else {
          await DB.installRelease(seed);
        }
        active = await DB.getActiveRelease();
      } catch (error) {
        if (!active) throw error;
        // A failed bundled refresh must never make the existing local library unavailable.
      }
    }
    if (!active) throw new Error("No active offline knowledge library is available.");
    return active;
  }

  async function renderCategories() {
    const categories = await DB.listCategories();
    categoriesHost.replaceChildren();
    categories.forEach(category => {
      const button = node("button", "knowledge-category");
      button.type = "button";
      button.appendChild(node("strong", "", category.title));
      if (category.description) button.appendChild(node("span", "", category.description));
      button.addEventListener("click", () => {
        activeCategory = category.id;
        searchInput.value = "";
        renderResults().catch(showError);
        byId("knowledgeCategoryLabel").textContent = category.title;
      });
      categoriesHost.appendChild(button);
    });
  }

  function renderArticleCard(article) {
    const button = node("button", "knowledge-result");
    button.type = "button";
    const top = node("span", "knowledge-result-top");
    top.appendChild(node("strong", "", article.title));
    top.appendChild(node("span", "knowledge-risk risk-" + article.safetyLevel, article.safetyLevel.toUpperCase()));
    button.appendChild(top);
    button.appendChild(node("span", "knowledge-result-summary", article.summary));
    button.addEventListener("click", () => openArticle(article.id).catch(showError));
    resultsHost.appendChild(button);
  }

  async function renderResults() {
    const query = searchInput.value.trim();
    const articles = query
      ? await DB.search(query, { categoryId: activeCategory, limit: 100 })
      : await DB.listArticles({ categoryId: activeCategory, limit: 100 });
    resultsHost.replaceChildren();
    articleHost.hidden = true;
    byId("knowledgeBrowse").hidden = false;
    if (!articles.length) {
      resultsHost.appendChild(node("p", "knowledge-empty", "No matching topics. Try a different word or clear the category filter."));
      return;
    }
    articles.forEach(renderArticleCard);
  }

  async function openArticle(articleId) {
    const article = await DB.getArticle(articleId);
    if (!article) throw new Error("That article is not available in the active library.");
    currentArticle = article;
    articleContent.replaceChildren();
    articleContent.appendChild(node("div", "knowledge-article-meta", article.jurisdiction + " • REVIEWED " + article.reviewedAt));
    articleContent.appendChild(node("h2", "", article.title));
    articleContent.appendChild(node("p", "knowledge-article-summary", article.summary));
    articleContent.appendChild(node("p", "knowledge-article-body", article.body));
    addTextSection(articleContent, "What to do", article.steps, true);
    addTextSection(articleContent, "Equipment", article.equipment, false);
    addTextSection(articleContent, "Common mistakes", article.commonMistakes, false);
    addTextSection(articleContent, "Dangers", article.dangers, false);

    const stop = node("aside", "knowledge-stop");
    stop.appendChild(node("h3", "", "STOP AND GET HELP"));
    stop.appendChild(node("p", "", article.stopAndGetHelp));
    articleContent.appendChild(stop);

    const sources = await DB.getSourcesForArticle(article.id);
    if (sources.length) {
      const sourceSection = node("section", "knowledge-article-section");
      sourceSection.appendChild(node("h3", "", "Sources and further guidance"));
      const list = node("ul");
      sources.filter(Boolean).forEach(source => {
        const li = node("li");
        const link = node("a", "", source.title + " — " + source.publisher);
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        li.appendChild(link);
        list.appendChild(li);
      });
      sourceSection.appendChild(list);
      articleContent.appendChild(sourceSection);
    }

    byId("knowledgeBrowse").hidden = true;
    articleHost.hidden = false;
    articleHost.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showError(error) {
    setStatus("Library issue — existing personal records are unaffected. " + (error && error.message ? error.message : "Try again."), "warning");
  }

  async function checkForUpdates(allowInstall) {
    if (!Object.keys(trustedKeys).length) {
      updateNote.textContent = "Secure updates are waiting for the HARCOM signing key to be configured. Your installed library remains fully offline.";
      return;
    }
    if (!Updater || !Crypto) {
      updateNote.textContent = "Secure update components are unavailable. Your installed library remains usable.";
      return;
    }
    updateButton.disabled = true;
    updateNote.textContent = "Checking the signed release manifest…";
    try {
      const checked = await Updater.checkForUpdates({
        manifestUrl,
        trustedOrigin: location.origin,
        trustedKeys
      });
      if (checked.status === "current") {
        updateNote.textContent = "Your offline library is up to date.";
      } else if (!allowInstall) {
        updateNote.textContent = "A new signed library is available. Tap CHECK FOR UPDATES to review and install it.";
      } else if (window.confirm("A new verified-source knowledge release is available. Download and install it now? Your current library will be kept if verification fails.")) {
        updateNote.textContent = "Downloading and verifying the new library…";
        const installed = await Updater.installUpdate({ checked, trustedKeys });
        activeRelease = installed.release;
        await renderCategories();
        await renderResults();
        updateNote.textContent = "Library updated and verified. Previous release retained for rollback.";
        setStatus("OFFLINE READY • " + activeRelease.counts.articles + " ARTICLES", "success");
      } else {
        updateNote.textContent = "Update available. Your current offline library is unchanged.";
      }
    } catch (error) {
      updateNote.textContent = "Update not installed. Current library kept. " + (error && error.message ? error.message : "");
    } finally {
      updateButton.disabled = !Object.keys(trustedKeys).length;
    }
  }

  byId("knowledgeClearSearch").addEventListener("click", () => {
    searchInput.value = "";
    activeCategory = null;
    byId("knowledgeCategoryLabel").textContent = "All topics";
    renderResults().catch(showError);
  });
  byId("knowledgeClearCategory").addEventListener("click", () => {
    activeCategory = null;
    byId("knowledgeCategoryLabel").textContent = "All topics";
    renderResults().catch(showError);
  });
  byId("knowledgeBack").addEventListener("click", () => {
    articleHost.hidden = true;
    byId("knowledgeBrowse").hidden = false;
    if (currentArticle) renderResults().catch(showError);
  });
  searchInput.addEventListener("input", () => {
    activeCategory = null;
    byId("knowledgeCategoryLabel").textContent = "All topics";
    renderResults().catch(showError);
  });
  document.querySelectorAll("[data-knowledge-article]").forEach(button => {
    button.addEventListener("click", () => openArticle(button.dataset.knowledgeArticle).catch(showError));
  });
  if (updateButton) {
    updateButton.disabled = !Object.keys(trustedKeys).length;
    updateButton.addEventListener("click", () => checkForUpdates(true));
  }

  (async function init() {
    try {
      setStatus("Preparing the offline library…");
      activeRelease = await ensureSeedLibrary();
      await renderCategories();
      await renderResults();
      ready = true;
      setStatus("OFFLINE READY • " + activeRelease.counts.articles + " ARTICLES • " + activeRelease.counts.categories + " CATEGORIES", "success");
      if (!Object.keys(trustedKeys).length) {
        updateNote.textContent = "Secure content updates are awaiting signing-key setup. Reading and searching are fully offline.";
      } else if (navigator.onLine) {
        checkForUpdates(false);
      }
      window.addEventListener("online", () => {
        if (ready && Object.keys(trustedKeys).length) checkForUpdates(false);
      });
    } catch (error) {
      showError(error);
    }
  })();
})();
