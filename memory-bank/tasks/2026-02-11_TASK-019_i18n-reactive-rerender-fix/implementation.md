# Implementation Notes

## Root cause
- `t(...)` читает модульную переменную `currentLanguage`, но большинство компонентов не подписаны на изменения языка и не ререндерятся автоматически.
- После reload initial render происходил до синхронизации языка из localStorage, что давало mixed RU/EN состояние.

## Changes
- `src/utils/i18n.ts`
  - Добавлены `subscribeLanguage(...)` и внутренний listener-set.
  - `setLanguage(...)` теперь уведомляет подписчиков.
  - `initializeLanguage()` и чтение localStorage сделаны безопасными для окружений без `window`.
- `src/routes/__root.tsx`
  - Root document подписывается на смену языка и обновляет `html[lang]`.
  - В результате смена языка ререндерит приложение целиком.
- `src/routes/dashboard.tsx`
  - Заголовок и подзаголовок страницы переведены на `t(...)`.
- `src/components/Dashboard.tsx`
  - Хардкодные RU-строки карточек групп заменены на i18n keys.
- `src/components/ScoreChart.tsx`
  - Дни недели формируются через `Intl.DateTimeFormat(locale, { weekday: 'short' })`.
  - Убран хардкод `ответов` из tooltip.

## i18n updates
- Добавлены ключи `dashboard.group.*` в:
  - `src/types/i18n.ts`
  - `src/utils/i18n.ts`
  - `src/utils/formTranslationCoverage.ts`
