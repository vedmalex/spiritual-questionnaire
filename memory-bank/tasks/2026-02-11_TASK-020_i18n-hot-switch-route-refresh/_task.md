# TASK-020 — i18n Hot-Switch Route Refresh

## Goal
Устранить кейс, когда после переключения языка (`RU/EN`) header обновляется сразу, а route-контент (например dashboard заголовок) остается на старом языке до ручного reload.

## Linked Requirements
- `UR-020`: локализация интерфейса.
- `UR-035`: i18n-first для новых форм и экранов.

## Deliverables
- Гарантированное обновление route-контента сразу после смены языка.
- Подтверждение сценариев: без reload и после reload.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, Playwright smoke)
