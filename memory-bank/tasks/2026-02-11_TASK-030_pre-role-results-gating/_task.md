# TASK-030 — Pre-Role Results Gating

## Goal
Не показывать пользовательские результаты до момента, пока пользователь не определился с ролью на входе.

## Linked Requirements
- `UR-003`: выбор роли при входе.
- `UR-013`: dashboard с результатами и историей.
- `WF-008`: любое UI-изменение подтверждается Playwright-сценарием.

## Deliverables
- Guard для route `/dashboard`, который не допускает просмотр результатов без пользователя/роли.
- UI-ограничение в header: ссылка на dashboard скрыта до завершения setup.
- Проверка сценария через Playwright с артефактами.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright check)
