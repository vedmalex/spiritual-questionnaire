# Requirements (Task-027)

## Source
- Regression finding from `TASK-026`:
  - paused session button `Продолжить` did not return user to active quiz screen.

## Acceptance
1. Нажатие `Продолжить` в paused banner возвращает пользователя к экрану quiz.
2. URL после resume содержит `quiz` и `q` параметры активной сессии.
3. Паузный cleanup не перетирает resume-навигацию.
4. Изменение подтверждено Playwright smoke в соответствии с `WF-008`.
