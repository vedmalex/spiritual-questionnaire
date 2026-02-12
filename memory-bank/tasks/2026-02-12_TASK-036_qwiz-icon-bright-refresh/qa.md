# QA

## Automated Checks
- [x] `npm run build`

## Playwright (WF-008)
- [x] Проверка `manifest` и списка иконок.
- [x] Проверка доступности icon URL (HTTP 200 + `image/png`).
- [x] Скриншот главной страницы после обновления icon-pack.
- [x] Скриншот прямого открытия `icons/qwiz-icon-512.png`.

## Known Issue
- [!] В runtime сохраняется ранее известный `BUG-003` (`React #418` hydration mismatch), не связан с редизайном иконок.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Static server: `npx serve -s dist/full/client -l 4173`
- Session: `task036icon`

## Evidence
- `output/playwright/2026-02-12-task-036-icon-refresh/home.png`
- `output/playwright/2026-02-12-task-036-icon-refresh/icon-512-page.png`
- `output/playwright/2026-02-12-task-036-icon-refresh/assert-manifest-icons.json`
- `output/playwright/2026-02-12-task-036-icon-refresh/assert-icon-fetch.json`
- `output/playwright/2026-02-12-task-036-icon-refresh/console-errors.log`
