# TASK-028 — Roundtrip Two-Browser Validation

## Goal
Закрыть открытый QA-хвост `TASK-003`: подтвердить полный roundtrip `export -> import -> verify` между двумя независимыми browser-сессиями.

## Linked Requirements
- `UR-032`: выгрузка всех результатов пользователя для переноса.
- `UR-033`: загрузка полного набора результатов из файла.
- `WF-008`: изменение/валидация UI-поведения фиксируется Playwright-тестом.

## Deliverables
- Реальный roundtrip сценарий в двух независимых Playwright browser sessions.
- Артефакты экспорта/импорта и проверка результата после импорта.
- Обновление `TASK-003` QA статуса (закрытие хвоста).

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (Playwright two-session roundtrip verified)
