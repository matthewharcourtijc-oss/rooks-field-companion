# Rook's Field Companion — current release QA

## Current repository state

- Current application release: **v0.9.9 — Dangerous fungi & berries guide**.
- Source of truth: `main/index.html`, `service-worker.js`, `manifest.json`, and `tests/validate.mjs`.
- The earlier v0.3.11 candidate notes below this file's former name are historical and are not the deployed release.
- The v0.9.9 release includes 14 illustrated dangerous-species cards, offline manual search, related-topic navigation, local tasks/notes/mission log, standard and password-encrypted backup flows, and a versioned offline app shell.

## Repository and deployment checks

- GitHub Actions validation and GitHub Pages deployment both passed on 3 November 2026 (run 83, commit `af478acc7696bb8c2201fd8a9054e88233d389e7`).
- The app release marker was corrected from 0.9.5 to 0.9.9.
- The validation suite now explicitly checks that the HTML release marker and service-worker cache version both match v0.9.9.
- A new GitHub Actions run is required to verify these latest changes before treating this commit as CI-passed.

## Security and data-handling boundaries

- The app is offline-first and has no account, cloud sync, analytics, or remote application dependencies.
- Ordinary tasks, notes, and mission-log records are stored locally by the browser; **they are not encrypted at rest**.
- Password-encrypted backup export is a separate protection for exported backup files; it does not mean the live browser storage is encrypted.
- Clearing browser/site data can permanently remove local records. Users must export and verify an external backup before clearing site data or changing device/browser.
- The field guide is an aide-memoire, not professional training or a substitute for current NHS, emergency-service, or specialist guidance.

## Remaining release checks

- Confirm the latest validation and Pages deployment workflow passes after the release-marker and test changes.
- Perform user-led checks on the target Samsung/Android device: install/update, launch, offline reload, persistence after closing/reopening, search, task/note/log create/edit/delete, standard export/import, encrypted backup restore, and storage-clear warning.
- Verify the downloaded backup opens and decrypts before relying on it.
- Do not describe this static CI suite as Android device certification, penetration testing, or an independent security audit.

## Viking AI Council boundary

The separate Viking AI Council engine remains frozen until the scheduled 4 November 2026 baseline review. Do not change its engine or workflow before that inspection.
