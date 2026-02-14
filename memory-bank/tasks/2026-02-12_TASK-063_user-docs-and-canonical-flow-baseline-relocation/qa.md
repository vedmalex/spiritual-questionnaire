# QA

## Structural checks
- [x] Canonical baseline exists at new path:
  - `docs/testing/user-flow-baseline.md`
- [x] User-facing manual exists:
  - `docs/guides/user-manual.md`

## Link checks
- [x] Canonical references updated in workflow/scenario docs.
- [x] Root docs index (`README.md`) distinguishes user docs vs canonical QA baseline.
- [x] `docs/guides/README.md` updated for new split.

## Path audit
- [x] Search confirms `docs/guides/user-manual.md` is now used as user documentation path.
- [x] Search confirms canonical QA references point to `docs/testing/user-flow-baseline.md`.

## Evidence commands
- `rg -n "docs/guides/user-manual\.md"`
- `rg -n "docs/testing/user-flow-baseline\.md"`
- `find docs -maxdepth 3 -type f | sort`
