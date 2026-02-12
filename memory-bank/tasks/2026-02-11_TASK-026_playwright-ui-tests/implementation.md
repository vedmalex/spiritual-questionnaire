# Implementation Notes

## Completed
- Выполнен preflight Playwright skill:
  - `npx` доступен (`11.7.0`);
  - wrapper script использован по пути `.../skills/playwright/scripts/playwright_cli.sh`.
- Реализован smoke run в CLI-first формате (без перехода к `@playwright/test`-спекам).
- Подготовлены:
  - сценарная матрица smoke/regression;
  - runbook запуска;
  - набор артефактов (screenshots/snapshots/download evidence) в `output/playwright/...`.

## Main Deliverables
- Scenario matrix:
  - `memory-bank/tasks/2026-02-11_TASK-026_playwright-ui-tests/artifacts/specs/scenario-matrix.md`
- Runbook:
  - `memory-bank/tasks/2026-02-11_TASK-026_playwright-ui-tests/artifacts/specs/playwright-runbook.md`
- Artifacts:
  - `output/playwright/2026-02-11-task-026-smoke/step-01-setup.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-02-student-list.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-03-quiz-active.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-04-paused-banner.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-05-curator-dashboard.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-06-admin-overview.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-07-admin-operations.png`
  - `output/playwright/2026-02-11-task-026-smoke/step-08-post-logout-setup.png`
  - `output/playwright/2026-02-11-task-026-smoke/user-backup-sample.json`

## Finding Extract
- Зафиксирован regression по resume paused quiz (`UR-012`): кнопка `Продолжить` не возвращает в активную сессию quiz.
- Вероятный источник: конфликт `handleResumePausedQuiz(...)` с effect, который всегда очищает quiz URL для paused сессии:
  - `src/routes/index.tsx:343`
  - `src/routes/index.tsx:381`
