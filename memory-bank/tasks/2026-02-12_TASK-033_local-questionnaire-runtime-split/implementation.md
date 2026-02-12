# Implementation Notes

## Runtime identity
- Добавлен helper `src/utils/questionnaireIdentity.ts`:
  - `runtimeId` для static: `metadata.quality`.
  - `runtimeId` для local: `local:<quality>`.
- В `src/types/questionnaire.ts` добавлены поля `runtimeId` и `source` (`static | local`).

## Adapter behavior
- `LocalStorageAdapter.getQuestionnaires()` теперь возвращает объединение static + local без исключения дублей по `quality`.
- `saveCustomQuestionnaire()` и `deleteCustomQuestionnaire()` нормализуют `quality` без `local:` префикса для хранения.
- `getQuestionnaireById()` сначала ищет по runtime-id, затем по legacy quality id.

## UI and routing
- `QuestionnaireList` разделяет карточки на встроенные и локальные; локальные маркируются меткой `(локальный)`.
- `useQuizSession` сохраняет `session.questionnaireId` как runtime-id.
- Обновлены `routes/index.tsx`, `Dashboard.tsx`, `QuestionnaireStatsPanel.tsx`, `reconciliation.ts`, `migration.ts` на runtime-id для корректного резолвинга схемы.

## Tests
- Добавлен `src/utils/questionnaireIdentity.test.ts`.
- Добавлен `src/services/localStorageAdapter.test.ts` (проверка co-existence static/local и резолв по runtime-id).
- Обновлен `src/hooks/useQuizSession.test.tsx` (локальная сессия сохраняет `local:<quality>`).
