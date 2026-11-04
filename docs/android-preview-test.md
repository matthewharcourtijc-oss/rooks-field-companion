# Android preview test — Offline Knowledge Engine

This preview runs from a local Termux web server on the phone. It uses the separate origin `127.0.0.1`, so it does not read or change the data in the installed live Field Companion.

## 1. Download the development preview

Open Termux and run:

```sh
cd ~/storage/downloads
curl -L -o field-companion-preview.zip "https://github.com/matthewharcourtijc-oss/rooks-field-companion/archive/refs/heads/development/offline-knowledge-engine.zip"
unzip -o field-companion-preview.zip
cd rooks-field-companion-development-offline-knowledge-engine
```

If `curl`, `unzip` or Python is missing, install the required Termux package with `pkg install curl unzip python`.

## 2. Start the local preview

Run:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Leave Termux running. Open Chrome on the phone and visit:

`http://127.0.0.1:8000/`

Open the **Library** tab. The first launch should install the bundled starter library into the separate IndexedDB database.

## 3. Run the database and cryptography test

In another Chrome tab visit:

`http://127.0.0.1:8000/tests/knowledge-engine.html`

Tap **Run database tests**. Check that package validation, staged installation, rollback, local search and the Ed25519/SHA-256 check all report PASS.

## 4. Test the actual library

Return to the app preview and check:
- Search for `hypothermia`, `power cut`, `anaphylaxis`, `coastal tide` and `compass bearing`.
- Open an article and inspect its steps, dangers, stop/help advice and source links.
- Browse the categories and emergency quick references.
- Open Tasks, Notes, Mission Log and Backup tabs; confirm they still appear and behave normally.

## 5. Test offline startup

1. While still connected, reload the local preview once so the new service worker activates and precaches the app shell and starter library.
2. In Termux, stop the server with **Ctrl+C**.
3. Turn on Airplane mode.
4. Reload `http://127.0.0.1:8000/` in Chrome.
5. Check that the service worker serves the cached app and that Library search and article reading still work.

If the browser says the site cannot be reached, the service worker may not have taken control yet. Turn Airplane mode off, restart the server, reload once, wait for the page to finish loading, then repeat the offline test.

## Important

- This is a development preview, not the live public app.
- The local preview database is separate from the production Field Companion database.
- Do not use the prototype for real medical or emergency decisions; follow current official advice and call emergency services when needed.
- Secure online content updates are not enabled until the production signing key is configured.
