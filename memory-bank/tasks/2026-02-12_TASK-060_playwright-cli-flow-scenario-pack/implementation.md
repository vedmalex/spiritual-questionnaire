# Implementation

## Scenario pack
- Added canonical scenario source:
  - `docs/testing/playwright-cli-flow-scenarios.json`
- The pack maps executable scenarios to user manual flow sections:
  - `STU-*`, `CUR-*`, `ADM-*`
- Scenario schema includes:
  - `id`, `flowIds`, `profile`, `path`, `viewport`, `requiredText`, `screenshot`, optional `action`.

## Playwright CLI runner
- Added runner:
  - `scripts/playwright-flow-scenarios.mjs`
- Runner behavior:
  - reads scenario pack JSON;
  - builds deterministic profile seeds (`anonymous`, `student_clean`, `student_with_results`, `student_with_paused`, `curator_with_results`, `admin_clean`);
  - resolves base questionnaire dynamically from `public/questionnaires/index.json`;
  - uses `$PWCLI` commands only (no Playwright test runner) for browser control;
  - supports action presets:
    - `open_first_quiz_question`
    - `open_first_report_preview`
    - `open_first_curator_review`
  - runs required text assertions per scenario;
  - stores screenshots and writes:
    - `assert.json`
    - `report.md`.

## CLI launcher and npm integration
- Added launcher:
  - `scripts/run-playwright-flow-scenarios.sh`
- Launcher behavior:
  - validates `npx` and `$PWCLI`;
  - starts `npm run dev` if app is not running;
  - runs scenario runner with `PW_BASE_URL`.
- Added npm command:
  - `npm run test:ui:flow-scenarios`

## Documentation updates
- Added runbook:
  - `docs/testing/playwright-cli-flow-scenarios.md`
- Updated root readme references:
  - `README.md`.

## Memory-bank alignment
- Created dedicated task artifacts:
  - `memory-bank/tasks/2026-02-12_TASK-060_playwright-cli-flow-scenario-pack/*`
