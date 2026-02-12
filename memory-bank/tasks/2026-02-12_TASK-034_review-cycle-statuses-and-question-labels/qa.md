# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Curator flow: раскрытие результата, проверка кнопок статусов и отображения текста вопроса рядом с номером.
- [x] Student dashboard flow: проверка отображения текста вопроса рядом с номером в списке ответов.
- [x] Browser console error check: `Errors: 0` в обоих сценариях.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Base URL: `http://127.0.0.1:3000`
- Sessions: `task034curator2`, `task034student`
- Seed:
  1. Curator: user role `curator` + `spiritual_questionnaire_results_curator`.
  2. Student: user role `student` + `spiritual_questionnaire_results_student`.

## Evidence
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/curator-after-expand.png`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/curator-after-expand.md`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/assert-curator.json`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/student-dashboard-results.png`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/student-dashboard-results.md`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/assert-student.json`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/console-curator-2026-02-11T23-49-24-551Z.log`
- `output/playwright/2026-02-12-task-034-review-status-and-question-labels/console-student-2026-02-11T23-50-27-359Z.log`
