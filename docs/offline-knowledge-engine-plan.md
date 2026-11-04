# Offline Knowledge Engine — Engineering Plan

**Status:** Discovery and baseline recorded; implementation not yet started  
**Target:** UK-first Field Companion knowledge library  
**Working branch:** `development/offline-knowledge-engine`  
**Protected baseline:** `main` at `0a8c23644cf7e2adc7018c66d82ccbe909433e84`  
**Product rule:** Reliability first. Survival second. Polish third. AI last.

## 1. Mission

Build a large, practical, UK-focused survival and resilience knowledge library that is fully usable without an internet connection. When a connection is available, the app may check for, download and safely install approved content updates. The library must remain usable if an update is interrupted or rejected.

The everyday interface must be simple, professional, readable on a phone and usable by someone under stress. Plain English only.

## 2. Non-negotiable safeguards

- Do not modify the protected `main` branch during development.
- Do not overwrite, migrate or mix personal Tasks, Notes, Mission Logs or their backups as part of a knowledge-content update.
- Keep the current app usable if the new database is empty, damaged, unsupported or only partly downloaded.
- Never activate partially downloaded content.
- Validate package format, schema version, content identifiers, sizes, hashes and signature before activation.
- Keep the previous known-good content release until the new release has passed local verification.
- Fail closed: on any uncertain update result, retain the currently active library.
- No remote dependency for reading/searching installed content.
- No AI-generated medical or safety advice at runtime.
- No claim that a plant, fungus or wild food is safe to eat based on an illustration or a casual description.
- Human approval required before merge, deployment or release.

## 3. Baseline evidence

- Repository: `matthewharcourtijc-oss/rooks-field-companion`
- Baseline branch: `main`
- Baseline commit: `0a8c23644cf7e2adc7018c66d82ccbe909433e84`
- Existing product is a single-page HTML PWA; main application and embedded manual are in `index.html`.
- Current offline shell is managed by `service-worker.js`, cache name `harcom-field-companion-v0.9.13`.
- The service worker precaches the app shell and removes older matching app-shell caches on activation.
- The manual is embedded in the HTML and has a local search index/behaviour.
- Personal Tasks, Notes and Mission Logs are currently stored together in a validated localStorage record with transaction/recovery safeguards and separate backup/restore paths.
- Existing test entry point is `node tests/validate.mjs`; it checks application structure, offline assumptions, manual sections, links, inline scripts and selected regression behaviours.
- Existing GitHub Pages workflow validates pull requests and deploys only from `main`.
- A dedicated development branch was created from the exact protected baseline. No application source or live deployment has been changed by this plan.

## 4. Proposed architecture

### A. Personal-data boundary

Keep personal operational records in their existing storage domain during the first knowledge-engine milestones. No content import, update, pruning or rollback code may write to personal-data keys. A future personal-data database migration would be a separate project with its own export, backup, migration and rollback gates.

### B. Knowledge database

Use IndexedDB as the leading candidate for a structured, searchable local content store, subject to a short compatibility and failure-mode spike on Android Chrome / installed PWA. Keep content data separate from personal records.

Proposed logical stores:
- `articles`: stable content ID, title, plain-language body, category, tags, reviewed date, review interval, reading time, safety level and source IDs.
- `categories`: navigation groups and descriptions.
- `media`: locally stored diagrams and supporting illustrations with type, size and hash.
- `sources`: publisher, exact source URL, title, publication/review date, access date and evidence notes.
- `releases`: installed content version, schema version, manifest hash, signature metadata and installation timestamp.
- `settings`: library-only preferences and last successful update check.

Avoid duplicating large media in article records. Use stable IDs and explicit schema versions.

### C. Update package and activation

The update service should retrieve a small release manifest when online. The manifest identifies a versioned, immutable content package and includes expected size, cryptographic hashes, schema compatibility and publisher signature.

Safe sequence:
1. Check connectivity and read the current installed release.
2. Fetch release metadata; do not download if unchanged.
3. Validate manifest structure, version ordering, schema compatibility and signature.
4. Download package into a staging area; enforce size limits.
5. Verify complete byte count and cryptographic hashes.
6. Parse and validate every record, reference and media item.
7. Install into a new inactive database/release namespace.
8. Run consistency checks and a read-back verification.
9. Atomically switch the active-release pointer only after all checks pass.
10. Retain the prior release for rollback; prune only after a later successful launch and explicit retention policy.

An interrupted download or failed validation must leave the active release untouched. A signature proves package origin/integrity, not factual correctness; content review remains a separate quality gate.

### D. Offline search and interface

Search must operate entirely against local records. Provide a simple home screen, obvious search, a small set of recognisable categories, emergency quick reference and a clear offline/update status. Article pages should use short headings, numbered actions, warnings, equipment lists and clear "when to get help" guidance.

Do not introduce a large front-end framework or remote font/script dependency without measured need. Prefer the current lightweight PWA foundation.

## 5. UK-first content scope

Priority content groups:
1. UK emergency response, calling 999/112, location sharing and help-seeking.
2. First aid and immediate life threats, grounded in current NHS / Resuscitation Council UK / St John Ambulance guidance.
3. Water collection, treatment limits, storage and contamination.
4. Shelter, warmth, hypothermia, heat illness, clothing and exposure.
5. UK weather, storms, floods, lightning, cold, heat and coastal hazards.
6. Navigation: OS maps, compass, route planning, lost-person actions and GPS limitations.
7. UK woodland, moorland, mountains, countryside and coastal environments.
8. Trees, plants, fungi and poisonous species, with conservative identification warnings.
9. Food hygiene, storage, cooking, emergency rations and explicit foraging cautions.
10. Fire and stove safety, legal/access restrictions and environmental protection.
11. Knots and cordage for ordinary camp tasks, with explicit limits around climbing, rescue and life-safety loads.
12. Equipment, clothing, repairs, lighting, batteries and communications.
13. Vehicle breakdowns, roadside safety, power cuts, evacuation and household resilience.
14. Family/group planning, checklists, signalling, rendezvous and emergency communication.

Content must distinguish official guidance, established practical technique and lower-confidence field tips. Every safety-critical article needs named sources, review date, hazards, stop conditions and escalation advice. UK legal/access advice must be location-aware and avoid presenting England rules as universal UK rules.

## 6. User experience requirements

- Mobile-first and comfortable on a Samsung Galaxy S22.
- Plain English; no unexplained technical terms.
- Large touch targets, strong contrast, readable type and restrained visual styling.
- Search prominent on the first screen.
- Short category labels and consistent navigation.
- Emergency guidance reachable in one or two taps.
- No dependency on network access to open, search or read installed content.
- Update status must say plainly: current, update available, downloading, verified, or update failed (current library kept).
- Preserve existing Tasks, Notes, Mission Log and Backup access.

## 7. Quality gates

### Gate 1 — Architecture spike
Prove IndexedDB open/read/write, schema versioning, quota handling, transaction rollback and offline reads in Android Chrome and installed PWA. Compare failure modes against the existing localStorage baseline.

### Gate 2 — Content engine
Test local indexing/search, article rendering, category browsing, media retrieval, schema validation and corrupt-record handling.

### Gate 3 — Update safety
Test valid update, no update, interrupted download, wrong hash, invalid signature, unsupported schema, malformed record, duplicate IDs, missing references, quota exhaustion, app termination mid-install and rollback.

### Gate 4 — Regression
Run all existing tests and add explicit regression checks for Tasks, Notes, Mission Log, standard backup, encrypted backup, restore, offline app shell, manual access and Android install.

### Gate 5 — Physical device
Install a diagnostic build alongside the existing app where possible. Test in airplane mode, after restart, with a valid update, and with deliberately failed/interrupted updates. Verify existing user records remain intact.

### Gate 6 — Independent review
Review security boundaries, update authenticity, storage failure modes, accessibility, factual sources and safety wording. No release claims until evidence supports them.

## 8. First implementation milestones

1. Complete source and storage audit; capture baseline test result.
2. Write and test a minimal IndexedDB compatibility/failure-mode spike on a separate branch.
3. Define content schema and signed package format before authoring bulk content.
4. Build a small representative UK content sample to test search and presentation.
5. Add safe update staging, verification, activation and rollback.
6. Expand the content library in reviewed batches.
7. Integrate the simple home screen and navigation without removing existing personal tools.
8. Run full regression and physical-device checks.

## 9. Explicit non-goals for the first release

- No cloud sync of personal records.
- No accounts or user tracking.
- No AI assistant making decisions in emergencies.
- No automatic deletion of old content before new content is verified.
- No claims of complete survival coverage or guaranteed safety.
- No replacement of hands-on training or official emergency advice.
- No changes to stable production until a reviewed release is explicitly approved.

---
This document is a plan and baseline record, not evidence that the database or update engine has already been implemented.
