# TASK-050 — Responsive Truncation in Result View

## Goal
Восстановить и зафиксировать адаптивное сокращение заголовков вопросов в списке результатов: на меньших экранах показывать меньшую видимую часть заголовка.

## Linked Requirements
- `UR-081`: В списках вопросов при просмотре результатов заголовок сокращается в одну строку с многоточием и адаптивной длиной по ширине экрана.
- `WF-008`: UI-изменения подтверждаются `playwright-cli`.

## Deliverables
- Исправление UI в `src/components/Dashboard.tsx`.
- Обновление `memory-bank/system/USER-REQ.md`.
- Playwright CLI проверка на нескольких viewport.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed
