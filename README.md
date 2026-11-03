
## v0.9.10 — Android install compatibility

- Added 192×192 and 512×512 HARCOM Viking-head PNG icons to the web app manifest, retaining the scalable SVG icon.
- Added both raster icons to the service-worker app-shell precache so install assets are available offline.
- Bumped the cache revision to `v0.9.10` so existing installations refresh the updated app shell and icon assets.
- Extended validation to check PNG signatures, dimensions, manifest declarations and offline precache entries.
- The consumer-facing product release label remains v0.9.9; this is an install-asset/cache compatibility revision.

# Rook's Field Companion — HARCOM Field Edition

## v0.9.9 — Dangerous fungi & berries guide

Expanded the UK field manual with a dedicated **Dangerous fungi & poisonous berries** section.

- Added 14 original, embedded SVG field plates: seven high-risk mushrooms and seven poisonous berry-bearing plants.
- Added plain-English appearance, habitat and hazard notes, including delayed-onset toxin warnings and dangerous lookalike cautions.
- Added an explicit no-foraging / no-identification disclaimer: the illustrations are orientation sketches, not a field key and cannot confirm a species is safe.
- Added an emergency response procedure based on NHS poisoning guidance, including when to call 999 or NHS 111 and what not to do while help is arranged.
- Added links to NHS, RHS and Woodland Trust reference material. External photo references require internet; the illustrations and safety guidance remain embedded and available offline.
- Bumped the offline app-shell cache to v0.9.9.
- No task, notes, mission-log, backup, restore, encrypted-backup or local-storage logic was intentionally changed.

## v0.9.5 — HARCOM Ownership & Provenance

- Added visible © 2026 HARCOM Industries ownership identification to the application footer.
- Added author, owner, application-name, copyright and site identity metadata to the HTML document.
- Added product/owner/release attributes to the document root as machine-readable provenance markers.
- Updated the install manifest to identify **HARCOM Industries — Field Companion**.
- Added a proprietary rights notice and repository NOTICE.
- Bumped the offline app-shell cache to v0.9.5.
- No task, notes, mission-log, backup, restore, recovery or survival-manual content was intentionally changed.

## v0.9.4 — HARCOM Industrial Identity

A focused presentation refinement for the consumer-facing app.

- Simplified the product title to **FIELD COMPANION**, with HARCOM Industries as the primary brand.
- Added a stronger compass insignia treatment, industrial graphite/steel surfaces and restrained icy-blue/hazard-orange detailing.
- Added subtle topographic texture and depth to the main field-system hero.
- Updated the Android install label to **Field Companion**.
- Bumped the offline app-shell cache to v0.9.4 so installed copies can receive the new presentation.
- No task, notes, mission-log, backup, recovery, manual-search or offline application logic was intentionally changed.

**Live app:** https://matthewharcourtijc-oss.github.io/rooks-field-companion/

## v0.9.3 — HARCOM Field Edition

A brand and consumer-interface refinement. HARCOM Industries is now the dominant product identity; technical storage diagnostics and build identifiers are kept out of the everyday interface. The offline-first app structure, local storage and recovery logic remain unchanged.

- Replaced the cramped terminal-style body typography with a clear, locally available Roboto / Noto Sans system font stack. No hosted font or network request is required.
- Strengthened the visual hierarchy, spacing, contrast and mobile reading scale across the app and embedded manual.
- Enlarged and reframed the existing 21 inline SVG diagrams so procedures are easier to inspect on a phone.
- Improved the field-manual topic cards, diagrams, related-topic navigation and hero illustration presentation.
- Bumped the service-worker cache so installed copies can receive the new shell.

## v0.9.1 — Connected Field Edition: every topic linked

One offline-first Android field tool combining Tasks, Notes, Mission Log, local backups and an expanded UK countryside / woodland field manual.

### Expanded manual
- Campcraft and site selection: drainage, wind, hazards, zoning, ground insulation and three shelter patterns.
- Cordage and camp knots: fixed loops, adjustable hitches, stopper knots, lashing concepts and safe loading limits.
- Firecraft: fire triangle, tinder and fuel preparation, ignition options, stove/fire safety and complete extinguishing.
- Watercraft: source selection, clarification, boiling, certified filters, contamination limits and clean storage.
- Navigation practice: handrails, attack points, aiming off, pacing, back bearings, contour awareness and relocation.
- Tool safety, field repairs, equipment inspection and battery conservation.
- Longer-stay routines, water/food inventory, hygiene, group roles and fatigue management.
- Signalling, visibility, rendezvous planning and missing-person search discipline.
- Added responsive inline SVG diagrams. All manual text and diagrams are embedded in `index.html`; no remote image or font dependency is required.
- Added a fully offline manual search with instant matching results, useful text previews, direct section jumps and one-tap clear.
- Added contextual links across every manual topic, connecting procedures, equipment and next actions.
- Added illustrated gravity pre-filter construction, treatment limits and commercial tourniquet placement guidance.
- Added a four-stage field response loop: prepare, respond, stabilise and reassess.

### Safety and land use
This is a practical educational reference, not a substitute for hands-on training. It avoids invasive medical procedures, risky food identification and life-safety rope techniques. Fire, foraging, access, tool carriage and camp activity must follow UK law, landowner rules, local restrictions and conservation requirements. Suspected chemical water contamination cannot be fixed by boiling or ordinary filters.

### Offline use
1. Open the app while online and wait for **offline cache ready**.
2. Add it to the Android home screen / install it.
3. Open it once, then test in airplane mode.
4. Check Tasks, Notes, Log, Field Manual and Backup.
5. Export JSON backups regularly.

The service worker precaches the app shell. External source links need internet access; the field manual and diagrams are embedded locally.

### Data protection
- Tasks, notes and logs are stored in this browser on this device; they do not sync.
- Browser storage is not encrypted and is not a secure vault.
- Clearing site data can erase records and recovery copies. Export backups regularly and keep a separate copy.

## Release safeguards
- The pre-v0.5 live index remains at `backups/index-before-v0.5-unified-offline.html`.
- The v0.3.11 backup remains at `backups/index-v0.3.11-before-survival-library.html`.
- The Viking AI Council remains separate.

## Ownership and permissions

The HARCOM Industries name and branding, and the original Field Companion application source, interface design, documentation and original diagrams are claimed as proprietary works by HARCOM Industries, © 2026. All rights reserved, except where a separate notice says otherwise. See [LICENSE](LICENSE) and [NOTICE](NOTICE.md). Public visibility on GitHub does not grant permission to copy, rebrand, redistribute or commercially exploit these works. No patent, trademark registration or technical anti-copying protection is claimed by this notice. Third-party names and materials, if any, remain the property of their respective owners.
