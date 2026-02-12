# QA

## Automated
- `npm test` — ✅ pass (`6 files`, `12 tests`)

## Playwright Smoke (WF-008)
- Tooling: Playwright CLI via wrapper script (`playwright` skill).
- Session: `task027`.
- Target: `http://127.0.0.1:3000`.
- Artifacts:
  - `output/playwright/2026-02-11-task-027-resume-fix/step-paused-before-resume.png`
  - `output/playwright/2026-02-11-task-027-resume-fix/step-resumed-quiz.png`
  - paused snapshot: `output/playwright/2026-02-11-task-027-resume-fix/.playwright-cli/page-2026-02-11T20-21-03-113Z.yml`
  - resumed snapshot: `output/playwright/2026-02-11-task-027-resume-fix/.playwright-cli/page-2026-02-11T20-21-26-072Z.yml`

## Result
- `BUG-002` воспроизведение больше не подтверждается:
  - до клика: paused banner видим;
  - после клика `Продолжить`: URL `/?quiz=titiksha&q=0&returnUrl=%2F`;
  - открыт экран вопроса (`Вопрос 1 из 3`).
