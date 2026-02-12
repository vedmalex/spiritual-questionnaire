# QA

## Playwright Roundtrip
- Tooling: Playwright CLI via wrapper (`playwright` skill).
- App target: `http://127.0.0.1:3000`.
- Sessions:
  - `task028a` — source browser (generate + export).
  - `task028b` — target browser (clean state + import + verify).

## Verification Checklist
- [x] В source-сессии создан результат прохождения и выполнен full export JSON.
- [x] Экспортированный payload валиден и содержит ожидаемое число результатов (`results.length = 1`).
- [x] В target-сессии импорт завершен без ошибок (`добавлено: 1`, `невалидно: 0`).
- [x] После импорта в target-сессии dashboard показывает `Мои результаты (1)` и карточку попытки по `titiksha`.
- [x] QA-хвост в `TASK-003` закрыт.

## Evidence
- Payload для переноса:
  - `output/playwright/2026-02-11-task-028-roundtrip/transfer-payload.json`
- До импорта (target empty):
  - `output/playwright/2026-02-11-task-028-roundtrip/.playwright-cli/page-2026-02-11T20-30-40-623Z.yml`
- После импорта (target populated):
  - `output/playwright/2026-02-11-task-028-roundtrip/.playwright-cli/page-2026-02-11T20-33-11-364Z.yml`
- Final visual checkpoint:
  - `output/playwright/2026-02-11-task-028-roundtrip/.playwright-cli/page-2026-02-11T20-33-26-010Z.png`
