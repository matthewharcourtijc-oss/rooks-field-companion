# Rook's Field Companion — Field Edition

**Live app:** https://matthewharcourtijc-oss.github.io/rooks-field-companion/

## v0.8.0 — Field Edition: search, clarity and visual overhaul

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
