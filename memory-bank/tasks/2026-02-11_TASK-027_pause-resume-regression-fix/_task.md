# TASK-027 — Pause/Resume Regression Fix

## Goal
Исправить regression `BUG-002`, при котором кнопка `Продолжить` в paused-состоянии не возвращает пользователя в активный поток прохождения опроса.

## Linked Requirements
- `UR-011`: восстановление сессии после перезагрузки.
- `UR-012`: pause/resume прохождения опроса.
- `WF-008`: любое изменение UI должно сопровождаться Playwright UI тестом.

## Deliverables
- Исправление resume-flow в runtime (`src/routes/index.tsx`, `src/hooks/useQuizSession.ts`).
- Unit test на pause -> resume сценарий.
- Playwright smoke evidence после фикса.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test` + Playwright resume smoke)
