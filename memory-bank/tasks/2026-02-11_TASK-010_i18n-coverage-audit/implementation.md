# Implementation Notes

## Completed
- Добавлен модуль `src/utils/formTranslationCoverage.ts`:
  - карта форм и ожидаемых translation keys,
  - расчет missing keys для `ru` и `en`,
  - summary по покрытию.
- Обновлен `TranslationManager`:
  - добавлена секция аудита покрытия переводов форм,
  - добавлен экспорт coverage report в JSON.
- Расширены i18n types и словари:
  - `src/types/i18n.ts`
  - `src/utils/i18n.ts`
- Переведен `CuratorDashboard` на `t(...)` ключи, включая статусы, действия, сообщения import/export и тексты групп.
- В `Header` локализованы тексты logout.

## Key References
- `src/utils/formTranslationCoverage.ts`
- `src/components/TranslationManager.tsx`
- `src/components/CuratorDashboard.tsx`
- `src/components/Header.tsx`
- `src/types/i18n.ts`
- `src/utils/i18n.ts`
