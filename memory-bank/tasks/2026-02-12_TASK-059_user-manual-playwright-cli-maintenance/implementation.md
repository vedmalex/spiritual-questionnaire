# Implementation

## Documentation baseline
- Added guide index:
  - `docs/guides/README.md`
- Added user manual:
  - `docs/guides/user-manual.md`
- Added canonical flow baseline:
  - `docs/testing/user-flow-baseline.md`
- Added profile/screen screenshots:
  - `docs/guides/assets/user-manual/student-desktop.png`
  - `docs/guides/assets/user-manual/student-mobile.png`
  - `docs/guides/assets/user-manual/curator-desktop.png`
  - `docs/guides/assets/user-manual/curator-mobile.png`
  - `docs/guides/assets/user-manual/admin-desktop.png`
  - `docs/guides/assets/user-manual/admin-mobile.png`

## Canonical flow baseline follow-up
- `docs/testing/user-flow-baseline.md` converted from short onboarding guide into canonical flow baseline:
  - role split: `student`, `curator`, `admin`;
  - screen split: `desktop`, `mobile`;
  - stable `Flow ID` sections for each core scenario;
  - expected outcomes and regression checkpoints for each flow.
- Added explicit update policy:
  - every UI behavior change must update flow description;
  - UI QA must reference impacted `Flow ID`.

## Playwright CLI maintenance flow
- Added script:
  - `scripts/generate-user-manual-screenshots.sh`
- Added npm command:
  - `npm run docs:user-manual:screenshots`
- Script behavior:
  - uses `$PWCLI` wrapper (`playwright-cli`);
  - builds role-specific localStorage sessions (`student`, `curator`, `admin`);
  - captures `desktop` and `mobile` screenshots for each role;
  - writes evidence manifest:
    - `output/playwright/2026-02-12-task-059-user-manual/assert.json`.

## Memory-bank sync
- Updated requirements/workflow/planning docs:
  - `memory-bank/system/USER-REQ.md` (`UR-093..UR-098`)
  - `memory-bank/system/WORKFLOW.md` (`WF-009`)
  - `memory-bank/system/PRD.md`
  - `memory-bank/system/ISSUES.md`
  - `memory-bank/system/current-context.md`
