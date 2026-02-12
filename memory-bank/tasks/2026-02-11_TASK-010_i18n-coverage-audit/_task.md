# TASK-010 — i18n Coverage Audit for Forms

## Goal
Реализовать проверку покрытия переводов по всем формам приложения и перевести новую форму куратора на i18n-first подход.

## Linked Requirements
- `UR-038`: Проверка покрытия переводов по всем формам.
- `UR-035`: Все новые формы проектируются по i18n-first подходу (частичное усиление через перевод CuratorDashboard).

## Deliverables
- Coverage audit utility по формам с отчетом missing translation keys.
- UI секция аудита в TranslationManager.
- Экспорт coverage report в JSON.
- CuratorDashboard переведен на translation keys (`t(...)`).

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npx tsc --noEmit`, `npm run build`)
