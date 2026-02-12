# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Засеян локальный опросник с тем же `metadata.quality`, что у встроенного (`titiksha`).
- [x] Подтверждено одновременное отображение встроенного и локального вариантов.
- [x] Подтверждена видимость метки локального опросника `(локальный)`.
- [x] Консоль браузера проверена: `Errors: 0`.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Base URL: `http://127.0.0.1:3000`
- Session: `task033`
- Scenario:
  1. `localStorage` очищается.
  2. Seed user (`student`) + `spiritual_questionnaire_custom_questionnaires` с локальным `titiksha`.
  3. Reload `/`.
  4. Проверка DOM (наличие локальной метки) + screenshot/snapshot.
- Result: ✅ Passed

## Evidence
- `output/playwright/2026-02-12-task-033-local-questionnaires-split/step-01-list-with-local-badge.png`
- `output/playwright/2026-02-12-task-033-local-questionnaires-split/snapshot-list-with-local-badge.md`
- `output/playwright/2026-02-12-task-033-local-questionnaires-split/assert-local-visibility.json`
- `output/playwright/2026-02-12-task-033-local-questionnaires-split/console-2026-02-11T23-31-16-106Z.log`
