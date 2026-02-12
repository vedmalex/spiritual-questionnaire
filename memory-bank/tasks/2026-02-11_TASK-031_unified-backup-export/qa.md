# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Проверен logout-flow на UI.
- [x] Подтвержден один download event: `user-backup-*.json`.
- [x] Проверен payload скачанного файла: содержит и `results`, и `curatorResults`.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Base URL: `http://127.0.0.1:3000`
- Scenario:
  1. Логин под пользователем.
  2. Seed student + curator results в localStorage.
  3. Logout.
  4. Проверка download event и JSON payload.
- Result: ✅ Passed

## Evidence
- `output/playwright/2026-02-11-task-031-unified-backup/step-01-post-logout.png`
- `output/playwright/2026-02-11-task-031-unified-backup/snapshot-after-logout-click.yml`
- `output/playwright/2026-02-11-task-031-unified-backup/artifact-user-backup.json`
