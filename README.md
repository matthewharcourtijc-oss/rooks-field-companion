# Rook's Field Companion — Unified Field Edition

**Live app:** https://matthewharcourtijc-oss.github.io/rooks-field-companion/

## v0.5 — Unified offline field app

- One interface for tasks, notes, mission log, backup and the full Survival Field Manual.
- UK countryside survival reference with inline diagrams, first aid, major trauma, water, shelter, navigation, rescue and fungi awareness.
- Offline application shell using a service worker; the first visit must be online so the app can cache itself.
- Installable web app manifest and Harcom SVG icon.
- No framework, external scripts, hosted fonts, API keys or subscription.
- Responsive gunmetal interface with a readable system sans-serif font stack.

## Offline use

1. Open the app while connected and allow it to finish loading.
2. Keep the page open briefly so the service worker can install and cache the app shell.
3. Add it to the Android home screen from Chrome.
4. Test in airplane mode before relying on it. The app shell and embedded manual are cached; external source links still require internet.

## Data and safety

- Tasks, notes and logs are stored locally in this browser on this device; they are not synced.
- Browser storage is not encrypted or a secure vault. Clearing site data can erase records and recovery copies.
- Export a JSON backup regularly and keep a separate copy.
- The field manual is a learning aid, not a substitute for hands-on training or professional advice. In an emergency in the UK, call 999 or 112.
- Offline cache and local data are separate: clearing the browser cache may require a new online visit, and clearing site storage can erase records.

## Release safeguards

- The exact pre-v0.5 live index is preserved at `backups/index-before-v0.5-unified-offline.html`.
- Previous v0.3.11 release backup remains at `backups/index-v0.3.11-before-survival-library.html`.
- The Viking AI Council remains a separate project.
