# TASK-037 — PWA Notifications for New Questionnaires

## Goal
В режиме PWA показывать системное уведомление, когда на сервере появились новые опросники (обновился статический `questionnaires/index.json`).

## Linked Requirements
- `UR-001`: приложение работает со статическими файлами.
- `UR-027`: mobile/PWA user experience.
- `WF-008`: пользовательское поведение подтверждается Playwright.

## Deliverables
- Runtime-сервис фоновой проверки новых опросников в PWA mode.
- Системное уведомление через Notification API / Service Worker notification.
- Локальное состояние known-index, чтобы не спамить уведомлениями.
- Документация и QA-артефакты (`npm test`, `npm run build`, Playwright).

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed
