# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Seed 2 paused sessions (`titiksha`, `shama`) в localStorage.
- [x] На списке отображаются две paused-карточки.
- [x] Выбор `shama` резюмирует именно `shama` (`q=4`, `status=active`), при этом `titiksha` остается в paused-store.

## Known Issue
- [!] В runtime сохраняется известный `BUG-003` (`React #418` hydration mismatch), не связан с данным изменением.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Static server: `npx serve -s dist/full/client -l 4175`
- Session: `task040multipaused`

## Evidence
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/home-with-paused-list.png`
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/resumed-shama.png`
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/assert-seeded-state.json`
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/assert-before-select.json`
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/assert-resume-selected.json`
- `output/playwright/2026-02-12-task-041-multi-paused-sessions/console-errors.log`
