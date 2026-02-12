# TASK-041 — Multiple Paused Quiz Sessions

## Goal
Исправить поведение pause/resume: студент может держать на паузе несколько опросников одновременно и при выборе конкретного опросника продолжает с сохраненного места именно этого опросника.

## Linked Requirements
- `UR-012`: корректный pause/resume flow.
- `UR-027`: mobile/PWA UX без потери прогресса.
- `WF-008`: UI-изменение подтверждается Playwright.

## Deliverables
- Runtime поддержка `1 active + N paused` сессий.
- Резюме конкретного paused-опросника через выбор карточки в списке.
- Backup/logout поддержка paused-сессий.
- Тесты + Playwright артефакты.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed
