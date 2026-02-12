# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Analytics tab opened with seeded student data.
- [x] Range trigger opens popover calendar (`DayPicker` grid visible).
- [x] Range selection applied (`08.02.2026 - 11.02.2026` visible in trigger).
- [x] Filtered analytics state confirmed (question dynamics shows `2+` gate message and low-data section).
- [x] Console error check: `Errors: 0`.

## Evidence
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/analytics-range-popover.png`
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/analytics-range-popover.yml`
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/analytics-range-selected.png`
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/analytics-range-selected.yml`
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/assert-range-picker.json`
- `output/playwright/2026-02-12-task-040-shadcn-range-picker-analytics/console-errors.log`
