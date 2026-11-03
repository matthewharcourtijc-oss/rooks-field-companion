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

- The candidate now has a dedicated logo slot at `../assets/harcom-logo.png` (repository path: `assets/harcom-logo.png`).
- Until the approved Harcom logo artwork is supplied, the header shows a simple `H` fallback; no substitute logo has been invented.
- Add the supplied transparent PNG at `assets/harcom-logo.png`. The existing fallback will disappear automatically when the image loads.
- A pre-logo candidate snapshot is preserved at `backups/Rooks_Field_Companion_v0.3.11-Visual-Polish-pre-logo-BACKUP.html`.
