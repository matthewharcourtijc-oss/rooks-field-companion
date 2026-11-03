# v0.3.11 Visual Polish Development Branch

This branch contains a development-only visual polish candidate and preserved source backups.

- Branch: `dev/v0.3.11-visual-polish-2026-11-03`
- Live `main` branch: intentionally unchanged.
- GitHub Pages: not redeployed from this branch.
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

Do not merge or deploy until the remaining checks pass and Viking approves release.

## Harcom logo integration

- Viking supplied the original Harcom Industries SVG artwork; it is stored unchanged as `assets/harcom-logo.svg`.
- The development candidate header loads it from `../assets/harcom-logo.svg` (relative to the candidate in `development/`).
- The full logo is displayed in a taller responsive header slot to preserve the Viking mark, wordmark and Celtic-knot divider; mobile sizing is reduced without cropping.
- A simple `H` fallback remains if the SVG cannot load.
- A pre-integration candidate snapshot is preserved at `backups/Rooks_Field_Companion_v0.3.11-Harcom-logo-pre-integration-BACKUP.html`.


## Navigation and accessibility pass

- Navigation controls are now native buttons rather than clickable generic divs, improving keyboard access and mobile interaction semantics.
- Each navigation control exposes `aria-pressed`, updated with the active panel.
- Touch targets are at least 44px high and visible keyboard-focus rings use the Harcom hazard-orange accent.
- A pre-accessibility-pass candidate snapshot is preserved at `backups/Rooks_Field_Companion_v0.3.11-Harcom-visual-before-accessibility-pass.html`.
- The change to JavaScript is limited to the tab-navigation handler, which now synchronizes the selected state for assistive technology. Storage, backup, recovery and transaction routines were not intentionally changed. Final Android interaction testing is still required.
