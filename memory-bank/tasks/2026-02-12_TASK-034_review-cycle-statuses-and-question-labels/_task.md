# TASK-034 — Review Cycle Statuses + Question Labels

## Goal
Уточнить цикл проверки между студентом и куратором:
- добавить понятные статусы проверки `на доработку` и `проверено`,
- убрать неоднозначность `одобрено` (оставить как legacy-алиас),
- показывать текст вопроса рядом с номером вопроса в формах просмотра/проверки у куратора и студента.

## Linked Requirements
- `UR-024`, `UR-025`: curator feedback flow.
- `UR-032`, `UR-033`: обмен результатами export/import между ролями.
- `WF-008`: любое изменение UI подтверждается Playwright-сценарием.

## Deliverables
- Новый статус `needs_revision` в доменной модели (UI label: `На доработку`).
- Legacy-совместимость для импортов со старым `approved`.
- Curator UI: кнопки `Отметить как проверено` и `Отправить на доработку`.
- Curator/Student UI: в списке ответов показывается и номер вопроса, и его текст на текущей локали.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright validation)
