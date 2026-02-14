# QA

## Automated checks
- [x] `npm test`
- [x] `npm run build`

## Playwright CLI checks
- [ ] Отложено по явному запросу пользователя на текущем шаге (временная пауза для ускорения итерации UI/UX).
- [x] Предыдущие артефакты `STU-04` из ранней итерации сохранены и доступны.

## Flow ID Status
- `STU-04` — `pass` (desktop/mobile)
- Non-scope failures in full pack:
  - `PW-FLOW-STU-05-QUIZ-DESKTOP`
  - `PW-FLOW-STU-05-QUIZ-MOBILE`
  - `PW-FLOW-STU-09-FEEDBACK-DESKTOP`
  - `PW-FLOW-STU-10-REVISION-DESKTOP`
  - `PW-FLOW-STU-12-REPORT-DESKTOP`
  - `PW-FLOW-CUR-03-REVIEW-DESKTOP`

## Evidence
- Unit tests:
  - `src/utils/studentQuestionnaireFolders.test.ts`
  - `src/services/localStorageAdapter.test.ts` (folder persistence case)
  - `src/utils/userBackup.test.ts` (backup compatibility with folder state)
- Build/test logs:
  - `npm test` (45/45 tests passed)
  - `npm run build` (full profile build passed)
- Playwright artifacts:
  - `output/playwright/flow-scenarios/assert.json`
  - `output/playwright/flow-scenarios/report.md`
  - `docs/guides/assets/user-manual/stu-04-list-desktop.png`
  - `docs/guides/assets/user-manual/stu-04-list-mobile.png`
