# TASK-014 — i18n-First Policy Enforcement

## Goal
Сделать соблюдение i18n-first не только декларацией, но и проверяемым процессом.

## Linked Requirements
- `UR-035`: все новые формы проектируются с учетом перевода на разные языки.
- `MH-003`: policy enforcement и регулярный review.

## Deliverables
- Формальный чеклист для разработки форм.
- Обновленный workflow с обязательным pre-merge тестом.
- Автоматический guard-тест покрытия переводов форм.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`)
