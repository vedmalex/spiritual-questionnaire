# TASK-012 — i18n Missing Keys Closure (UR-038 Follow-up)

## Goal
Закрыть missing translation keys, выявленные form coverage audit для admin/editor/translation/loader/chart/dashboard.

## Linked Requirements
- `UR-038`: Проверка покрытия переводов для всех форм.
- `UR-035`: i18n-first для новых/измененных форм.

## Deliverables
- Добавлены отсутствующие translation keys в `TranslationKeys` и `translations` (`ru/en`).
- Формы переведены на новые ключи в соответствующих UI-компонентах.
- Coverage audit показывает `11/11` fully covered и `0 missing keys`.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npx tsc --noEmit`, `npm run build`, coverage audit)
