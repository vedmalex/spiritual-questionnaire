# TASK-029 — Student Profile UX Simplification + Multilingual Schema Upgrade

## Goal
Свести student-кабинет к минимуму отвлекающих настроек, перенести настройки в отдельный профиль, зафиксировать JSON+replace defaults, вынести динамику в отдельную вкладку аналитики и синхронизировать мультиязычную схему опросника с редактором/skill.

## Linked Requirements
- `UR-022`, `UR-039`: мультиязычность схемы и редактора опросников.
- `UR-034`, `UR-050`: динамика по вопросам для анализа.
- `UR-045`: импорт/экспорт локальных опросников.
- `WF-001`: i18n-first forms.
- `WF-008`: UI change requires Playwright test.

## Deliverables
- Новый экран `/profile` с редактированием имени и всеми настройками.
- Student/curator UI без технических селекторов формата/стратегии (defaults: JSON + replace).
- Отдельная dashboard-вкладка аналитики динамики + usage tracking.
- Обновленная схема опросника: `metadata.languages` + localized `question/context_sources/self_check_prompts`.
- Обновленный skill `spiritual-questionnaire-architect`.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright smoke)
