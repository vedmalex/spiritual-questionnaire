# Implementation Notes

## Completed
- Реализован full transfer payload в JSON (`src/utils/resultsTransfer.ts`, `src/utils/exportUtils.ts`).
- Реализован импорт полного набора результатов с дедупликацией (`skip`/`replace`) в `useResults`.
- Добавлен UI-flow импорта в dashboard (`src/components/Dashboard.tsx`).
- Расширен data adapter batch-операцией `saveResults`.

## Dedupe Policy
- `skip`: при конфликте `result.id` существующий результат сохраняется.
- `replace`: при конфликте `result.id` импортированный результат заменяет существующий.
