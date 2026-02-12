# TASK-035 — PWA + Static Hosting Readiness + QWIZ Icon

## Goal
Подготовить приложение к практическому использованию как PWA и подтвердить, что его можно размещать на статическом хостинге без обязательного backend-сервера. Дополнительно внедрить собственную бренд-иконку приложения `QWIZ` (духовно-аналитический опросник для самоанализа и практики осознанности).

## Linked Requirements
- `UR-001`: статический web app + статические файлы.
- `UR-027`: mobile-friendly UX (включая PWA install path).
- `WF-008`: любые UI-изменения подтверждаются Playwright-сценарием.

## Deliverables
- Включен static-friendly build output с `index.html` в `dist/<profile>/client`.
- Добавлен fallback `404.html` для deep-links на статическом хостинге.
- Добавлена PWA-конфигурация: `manifest`, service worker registration, offline fallback.
- Создан и подключен новый набор иконок `QWIZ` (regular + maskable + apple-touch + favicon).
- Обновлена документация по статическому деплою и PWA checklist.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (с открытым follow-up `BUG-003`: React hydration #418 в static prerender runtime)
