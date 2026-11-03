# v0.3.11 Visual Polish Development Branch

This branch contains a development-only visual polish candidate and preserved source backups.

- Branch: `dev/v0.3.11-visual-polish-2026-11-03`
- Live `main` branch: v0.3.11 promoted on 3 November 2026.
- GitHub Pages: deployment triggered by the release commit; publication verification pending.
- Candidate: `development/Rooks_Field_Companion_v0.3.11-Visual-Polish-Candidate.html`
- Pre-polish Repair 2 backup: `backups/Rooks_Field_Companion_v0.3.11-Repair2-pre-polish-BACKUP.html`
- Locked original master: `backups/Rooks_Field_Companion_v0.3.11-ORIGINAL-MASTER-LOCKED.html`

## Integrity references

- Visual polish candidate SHA-256: `bbc108ddc12e214d8e8a085f2434c6b29273b27165b85bae0212e71c449100d8` (114,426 bytes)
- Pre-polish Repair 2 SHA-256: `dd1920528eba14666ac83b1f6f498863c5dd0d852f414de375d8aae86a590260` (106,813 bytes)
- Original master SHA-256: `67c796c6ca930db837e804e7a071f5b185cb461557055e6e1c1a6c7774977b57` (106,638 bytes)

## Verification status

- User-led Samsung checks passed for core task, backup, import and restore flows on Repair 2.
- Visual polish pass changes presentation only; no app logic or storage paths intentionally changed.
- HTML parse and JavaScript syntax checks passed.
- Automated browser navigation was blocked by the test environment, so no screenshot/browser certification is claimed.
- Isolated transaction failure tests, independent review, final Samsung regression and explicit release approval remain outstanding.

Release was explicitly approved by Viking on 3 November 2026. Static HTML/JavaScript checks passed before promotion. Final on-device Samsung regression remains required; do not claim Android certification.

## Harcom logo integration

- Viking supplied the original Harcom Industries SVG artwork; it is stored unchanged as `assets/harcom-logo.svg`.
- The supplied SVG is retained in `assets/harcom-logo.svg` as the source artwork.
- The logo is temporarily disabled in the candidate header following visual review; a compact `H` mark is used instead. The SVG is not deleted and can be reconsidered later.
- A pre-integration candidate snapshot is preserved at `backups/Rooks_Field_Companion_v0.3.11-Harcom-logo-pre-integration-BACKUP.html`.


## Navigation and accessibility pass

- Navigation controls are now native buttons rather than clickable generic divs, improving keyboard access and mobile interaction semantics.
- Each navigation control exposes `aria-pressed`, updated with the active panel.
- Touch targets are at least 44px high and visible keyboard-focus rings use the Harcom hazard-orange accent.
- A pre-accessibility-pass candidate snapshot is preserved at `backups/Rooks_Field_Companion_v0.3.11-Harcom-visual-before-accessibility-pass.html`.
- The change to JavaScript is limited to the tab-navigation handler, which now synchronizes the selected state for assistive technology. Storage, backup, recovery and transaction routines were not intentionally changed. Final Android interaction testing is still required.


## Simplification pass — 3 November 2026

- Removed the logo from the candidate interface for now; retained the original SVG asset separately.
- Replaced the long Field Guide text with short practical sections: emergency, shelter, navigation, water, wild plants/fungi, weather/ground and knots.
- Added lightweight inline SVG example diagrams for two tarp shelter shapes and compass points. These are schematic references, not certified instructions.
- Reduced NHS-heavy first-aid material to concise emergency actions and 999/112 guidance; detailed medical explanations and repeated disclaimers removed.
- Simplified the Backup introduction and moved technical architecture/change-log material behind expandable details. Export/import/validate/restore controls and storage code were preserved in this pass.
- This is a content/UI refinement only. It has not yet had final Android regression testing; do not deploy or merge.


## Release record — 3 November 2026

- Live release source: `index.html` copied from the cleaned v0.3.11 candidate.
- Previous v0.1 live entry point preserved on `main` at `backups/index-v0.1-live-before-v0.3.11-release.html`.
- Developer-only architecture/change-log/known-limitations panels were removed from the user-facing app; backup/import/validate/restore controls were retained.
- Candidate JavaScript syntax checked before promotion. External script and stylesheet references: none.
- GitHub Pages deployment and final Samsung Chrome regression checks still need confirmation.
