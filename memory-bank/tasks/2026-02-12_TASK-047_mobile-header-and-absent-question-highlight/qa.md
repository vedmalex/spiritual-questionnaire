# QA

## Automated checks
- [x] `npm test`
- [x] `npm run build`

## Playwright CLI checks
- [x] Mobile viewport `448x640`: compact header layout, profile block in top row.
- [x] Mobile viewport `375x667`: no horizontal overflow (`overflow = 0`).
- [x] Dashboard absent flow:
  - hint text is visible;
  - per-question absent badge count = `0`;
  - absent questions are highlighted by colored border.

## Evidence
- `output/playwright/2026-02-12-task-047-mobile-layout-absent-highlight/header-compact-448.png`
- `output/playwright/2026-02-12-task-047-mobile-layout-absent-highlight/dashboard-absent-highlight-375.png`
- `output/playwright/2026-02-12-task-047-mobile-layout-absent-highlight/assert-mobile-overflow.json`

