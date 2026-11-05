# Rook Engineering Protocol — Field Companion pilot review

**Date:** 4 November 2026  
**Review branch:** `engineering/rook-protocol-companion-review-2026-11-04`  
**Reviewed candidate:** `development/offline-knowledge-engine` at `2a79f1055b4295c9e3109a375e47d5a8246de586`  
**Protected production baseline:** `main` at `0a8c23644cf7e2adc7018c66d82ccbe909433e84`  
**Scope:** Source-level review of the offline knowledge engine, package verifier/updater, UI integration, regression tests and CI evidence.

## Executive result

**Prototype CI: PASS. Production/release readiness: NOT APPROVED.**

The current candidate's latest inspected CI run (#278, run ID `41922311084`) completed successfully. The validation job passed; the GitHub Pages deployment job was skipped. This is appropriate for a pull-request run and is not a production deployment.

The review found no reproducible application-code defect that justifies an untested patch in this pass. Per the Rook standard, no speculative code change has been made. The verified gaps below are retained as work items and release gates.

## Stage 1 — Discover and baseline

- Candidate is a development branch; production `main` was not changed.
- Knowledge records use a dedicated IndexedDB database, `harcom-field-knowledge`.
- The knowledge engine does not read or write the existing localStorage personal-data record; structural tests explicitly guard this boundary.
- The app's existing Tasks, Notes, Mission Log and backup/restore paths are exercised by the Chromium regression test on a fresh local origin.
- Online content updates remain disabled until a trusted production public key is configured.

## Stage 2 — Independent source and design challenge

### Controls observed in source

- Package schema, record counts, IDs, references, safety fields, HTTPS source URLs and media bounds are validated before installation.
- Content is staged in a separate release namespace, read back, checked against stored counts and search-index contents, then activated by changing the active-release pointer in a read/write transaction.
- Previous content is retained and can be reactivated for rollback.
- Signed updates verify exact downloaded bytes with SHA-256 and Ed25519 before the package is passed to the database installer.
- Update fetches require HTTPS, same-origin checks, omit credentials and reject redirects.
- The UI renders article text as text nodes rather than executing article HTML.
- No trusted production key is present, so the update action remains disabled.

### Findings and required follow-up

| Priority | Finding | Required action |
|---|---|---|
| High | Physical Android behaviour has not been established by desktop CI. | Install and exercise the isolated preview on the Samsung Galaxy S22; test offline start, restart, search, article/media reads and storage pressure. |
| High | Medical, species and other safety-critical material has not received independent qualified sign-off. | Obtain appropriate subject-matter review before public release; engineering source checks are not clinical certification. |
| High | Process termination during a staged install and recovery after browser/app termination are not demonstrated by the current automated suite. | Add interruption/reopen tests where feasible and complete targeted device fault testing. |
| Medium | Cross-tab contention and simultaneous install/activation behaviour are not directly covered by the current test evidence. | Add deterministic concurrency tests and a two-tab browser test before enabling signed updates. |
| Medium | The database upgrade handler creates missing stores but does not explicitly assert or migrate the key paths/indexes of stores that already exist. | Compare historical development schema versions and add a migration test before any wider deployment or schema change. |
| Medium | The current browser test proves the personal-data regression on a clean test origin, not preservation of records already on Viking's physical device. | Complete a user-data-preserving S22 test with a verified backup and rollback plan. |
| Medium | Production update authenticity is not operationally configured. | Keep updates disabled until key custody, public-key pinning, signed manifest publication, key rotation and recovery are independently reviewed. |

## Stage 3 — Test evidence

Latest inspected run:
- Workflow: Validate and deploy Field Companion
- Run: [#278](https://github.com/matthewharcourtijc-oss/rooks-field-companion/actions/runs/41922311084)
- Validation job: **success**
- App shell / links / manifest / JavaScript validation: **success**
- Structural knowledge-engine checks: **success**
- IndexedDB and cryptography runtime tests: **success**
- Headless Chromium browser/offline regression: **success**
- Pages deployment job: **skipped**

The PR description also records the 48-article / 18-category browser and offline validation. That evidence is useful, but it does not replace device or expert review.

## Stage 4 — Repair decision

No application-code patch is justified by a reproduced failure in this review. Creating a patch without a failing case would weaken the evidence trail rather than improve reliability.

The actionable repair work is test hardening around:
1. IndexedDB schema upgrade compatibility;
2. simultaneous/cross-tab installation and activation;
3. interrupted installation and recovery after reopen;
4. physical-device regression and personal-data preservation.

These should be handled as separate, reviewable changes with a failing test first, then the smallest repair, then a complete rerun.

## Stage 5 — Change control

- This report is documentation only.
- No application source, production branch, Pages deployment, signing key or user data was changed.
- No PR was merged and no release was made.
- The existing development candidate remains separate from production.
- Release remains blocked on the high-priority gates above.

**Rook assessment:** The prototype has a credible automated baseline. The next improvement should be stronger failure-mode and device evidence, not more features or a premature release.
