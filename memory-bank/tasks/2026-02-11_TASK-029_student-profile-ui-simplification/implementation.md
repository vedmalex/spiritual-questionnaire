# Implementation Notes

## UI Simplification (Student + Curator)
- Убраны селекторы `export format` и `import strategy` из student dashboard и curator dashboard.
- Импорт теперь вызывается со стратегией `replace` по умолчанию, экспорт в UI зафиксирован в `json`.
- В student dashboard добавлена поясняющая строка про defaults (`JSON + replace`).
- В curator dashboard добавлена аналогичная строка defaults.

## Dashboard Analytics Tab
- Добавлен новый tab: `results | analytics | feedback`.
- `ScoreChart` и `QuestionnaireStatsPanel` перенесены в `analytics` tab.
- Добавлен локальный usage counter `spiritual_questionnaire_dashboard_analytics_views` + analytics event `open_analytics`.

## Profile Page
- Добавлен route `/profile` и компонент `ProfilePage`.
- Добавлено редактирование имени пользователя.
- В профиль перенесены настройки языка/темы/роли.
- В профиль перенесена загрузка локального опросника (`QuestionnaireLoader`), убрана с главной student-страницы.
- Header упрощен: убраны inline переключатели языка/темы/роли, добавлен nav-link на профиль.

## Multilingual Questionnaire Schema
- Обновлены типы/нормализация:
  - `metadata.languages`
  - localized `metadata.title`, `metadata.source_lecture`
  - localized `question`, `context_sources`, `self_check_prompts`
- Добавлена migration `v5` (нормализация кастомных опросников под новую схему + schema reconciliation).
- Обновлен seed-файл `public/questionnaires/titiksha.json` на полный RU/EN формат.
- Редактор опросников переработан под мультиязычные поля контекста и self-check по каждому языку.

## Skill + Agent Files
- Обновлен `spiritual-questionnaire-architect/SKILL.md` под новый multilingual contract.
- В `AGENTS.md` (root + subproject) добавлено явное правило про обязательный Playwright check для UI-изменений.

## i18n / Terminology Cleanup
- Добавлены ключи для profile/analytics.
- Убраны из пользовательских формулировок лишние технические термины (`JSON`, `ID`, `translation file`) там, где это мешает UX.
- Обновлен `formTranslationCoverage` (новая форма `profile`, новые dashboard/curator/header keys).
