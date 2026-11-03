# Rook's Field Companion — Unified Field Edition

**Live app:** https://matthewharcourtijc-oss.github.io/rooks-field-companion/

## v0.5.1 — Offline reliability and consistency pass

- One Android-friendly app for Tasks, Notes, Mission Log, Backup and the embedded Survival Field Manual.
- The survival manual is part of the main page; it is not a separate app or a second data store.
- UK countryside guidance includes emergency priorities, major trauma and penetrating injuries, first aid, shelter, fire, water, food and foraging awareness, navigation, weather, rescue and kit.
- Manual diagrams are embedded in the page, so they are available with the cached app shell.
- Gunmetal interface with restrained ice-blue and hazard-orange accents; system font stack only.
- No frameworks, external scripts, hosted fonts, API keys or subscription.
- Service-worker cache version is tied to the release. Cache writes are awaited before fetch events complete, and a new release replaces the previous app-shell cache after activation.

## Offline setup and test

1. Open the live app while connected to the internet.
2. Leave it open until the status line reports that the offline cache is ready.
3. In Chrome, use **Add to Home screen** (or **Install app**, if offered).
4. Open the installed app once while online.
5. Turn on airplane mode and fully close/reopen the app.
6. Check each tab: Tasks, Notes, Log, Field Manual and Backup. Create a harmless test entry, close/reopen, and confirm it remains.
7. Turn airplane mode off and export a JSON backup.

The first visit must be online so the service worker can install and cache the app shell. External reference links in the manual still need an internet connection.

## Data and safety

- Tasks, notes and logs are stored locally in this browser on this device; they are not synced between devices.
- Browser storage is not encrypted and is not a secure vault. Anyone with access to the unlocked device/browser may be able to view it.
- Clearing site data can erase records and recovery copies. Export JSON backups regularly and keep a separate copy outside the browser.
- The manual is a learning aid, not a substitute for hands-on training, current professional guidance or emergency services.
- In an emergency in the UK, call **999 or 112**. Follow the call handler's instructions.

## Release safeguards

- The exact pre-v0.5 live index is preserved at `backups/index-before-v0.5-unified-offline.html`.
- Previous v0.3.11 release backup remains at `backups/index-v0.3.11-before-survival-library.html`.
- The Viking AI Council remains a separate project.
