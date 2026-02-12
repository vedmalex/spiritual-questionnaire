# TASK-019 — i18n Reactive Rerender Fix

## Goal
Исправить рассинхронизацию переводов после смены языка/перезагрузки страницы: язык должен применяться ко всем компонентам сразу, без ручного reload формы.

## Linked Requirements
- `UR-020`: локализация UI.
- `UR-035`: i18n-first для форм.

## Deliverables
- Реактивная подписка на смену языка в i18n utility.
- Root-level rerender при смене языка.
- Устранение видимого RU/EN mixed state в dashboard ключевых блоках.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run audit:mobile`)
