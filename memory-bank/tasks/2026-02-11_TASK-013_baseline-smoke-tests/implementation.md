# Implementation Notes

## Added Tests
- `src/utils/questionnaireSchema.test.ts`
- `src/utils/resultsTransfer.test.ts`
- `src/hooks/useQuizSession.test.tsx`
- `src/hooks/useResults.test.tsx`

## Infra Update
- `vitest.config.ts`
  - `test.environment = jsdom`
  - `resolve.dedupe = ['react', 'react-dom']`
  - aliases for `react` and `react-dom` to avoid invalid hook call in tests.

## Outcome
- `npm test` now executes and passes.
- Baseline regression safety for core session/results/schema/transfer flows established.
