# Implementation Notes

## Scope
- Изменена только логика сессий quiz-flow и связанные storage/backup пути.

## Implementation Log
- Добавлен storage key `STORAGE_KEYS.PAUSED_SESSIONS`.
- Расширен `DataAdapter`/`LocalStorageAdapter` методами:
  - `getPausedSessions()`
  - `savePausedSessions(sessions)`
  - `clearPausedSessions()`
- Обновлен `useQuizSession`:
  - модель состояния: `session` (active) + `pausedSessions[]`;
  - `pauseSession()` переносит active session в paused-store и очищает current slot;
  - `createSession(questionnaire)` сначала пытается резюмировать paused-сессию выбранного опросника, иначе стартует новую;
  - при переходе между опросниками активная сессия безопасно уходит в paused-store;
  - `resumeSession(questionnaireId?)` резюмирует конкретный paused-опросник (или самый свежий без id).
- Обновлен `migration` schema-reconciliation:
  - clamping `currentQuestionIndex` теперь применяется и к `PAUSED_SESSIONS`.
- Обновлен student UI flow (`/src/routes/index.tsx`):
  - выбор опросника теперь резюмирует именно его paused-сессию;
  - paused-card detection через `pausedQuestionnaireIds`.
- Обновлен `QuestionnaireList`:
  - карточки paused-опросников помечаются визуально;
  - кнопка на paused-карточке отображает `Продолжить`;
  - добавлены `data-*` маркеры для стабильной e2e-проверки.
- Обновлен backup pipeline (`useUser`, `userBackup`):
  - unified backup теперь включает `pausedSessions`;
  - logout очищает paused-store;
  - restore восстанавливает paused-store.
- Обновлены unit tests:
  - `useQuizSession.test.tsx` покрывает сценарий с несколькими paused-опросниками.
  - `userBackup.test.ts` обновлен под новый payload (`pausedSessions`).
