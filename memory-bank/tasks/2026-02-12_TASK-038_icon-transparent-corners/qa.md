# QA

## Automated Checks
- [x] `npm run build`

## Playwright (WF-008)
- [x] Скриншот обновленной иконки и прямого открытия `icons/qwiz-icon-512.png`.
- [x] Проверка `manifest` и списка icon entries.
- [x] Проверка доступности icon URL (HTTP 200 + `image/png`).
- [x] Проверка пикселей:
  - внешние углы иконки прозрачные (`alpha=0`),
  - зоны бывших «белых уголков» сверху карточки окрашены в фон (orange), а не white.

## Known Issue
- [!] В runtime сохраняется известный `BUG-003` (`React #418` hydration mismatch), не связан с изменением иконки.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Static server: `npx serve -s dist/full/client -l 4173`
- Session: `task038icon2`

## Evidence
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/home.png`
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/icon-512-page.png`
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/assert-manifest-icons.json`
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/assert-icon-fetch.json`
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/assert-corner-pixels.json`
- `output/playwright/2026-02-12-task-038-icon-transparent-corners/console-errors.log`
