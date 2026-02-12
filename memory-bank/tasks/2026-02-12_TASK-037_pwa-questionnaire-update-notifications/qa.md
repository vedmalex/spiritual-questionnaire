# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Сценарий: при старом snapshot (`['titiksha.json']`) и текущем index (`['shama_questionnaire.json','titiksha.json']`) отправляется notification.
- [x] Проверка payload: title/body/count/names и `addedFiles`.
- [x] Проверка обновления snapshot после проверки.

## Known Issue
- [!] В runtime сохраняется известный `BUG-003` (`React #418` hydration mismatch), не связан с notification feature.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Static server: `npx serve -s dist/full/client -l 4173`
- Session: `task037notify`
- Test approach: `addInitScript` mocks (`display-mode`, `Notification`, `navigator.serviceWorker`) + seeded localStorage snapshot.

## Evidence
- `output/playwright/2026-02-12-task-037-pwa-update-notifications/home.png`
- `output/playwright/2026-02-12-task-037-pwa-update-notifications/assert-notifications.json`
- `output/playwright/2026-02-12-task-037-pwa-update-notifications/assert-snapshot.json`
- `output/playwright/2026-02-12-task-037-pwa-update-notifications/console-errors.log`
