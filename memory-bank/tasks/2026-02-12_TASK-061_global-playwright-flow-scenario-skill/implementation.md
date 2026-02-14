# Implementation

## Global skill created
- Path: `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder`

## Core behavior
- Input: requirements markdown with Flow IDs or structured flows JSON.
- Output: executable `scenario-pack.json`.
- Execution: collector consumes pack and runs `playwright-cli` flow traversal.

## Scripts
- `generate-flow-scenario-pack.mjs`
  - Extracts flow IDs from markdown headings (`STU-*`, `CUR-*`, `ADM-*`) or `flows.json`.
  - Merges mapping overrides (path/profile/viewports/requiredText/action).
  - Produces deterministic scenario IDs and screenshot names.
- `collect-flow-artifacts.mjs`
  - Runs each scenario through `$PWCLI`.
  - Seeds profile/scenario localStorage.
  - Verifies required text via `eval document.body.innerText`.
  - Captures screenshot and writes:
    - `assert.json`
    - `report.md`
- `run-flow-artifacts.sh`
  - Wrapper for app reachability checks and optional auto-start (`PW_APP_START_CMD`).

## Stability fixes embedded
- Short hashed session IDs to reduce socket/path issues.
- `playwright-cli` error detection by parsing `### Error` markers even when exit code is zero.
- Screenshot reliability via `screenshot` command output parsing + explicit file copy into artifact path.

## Templates and references
- `references/scenario-pack-schema.md`
- `assets/flows.template.json`
- `assets/mapping.template.json`
- `assets/scenario-pack.template.json`
