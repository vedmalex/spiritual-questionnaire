# QA

## Automated checks
- [x] `npm run test -- src/utils/questionnaireRules.test.ts src/utils/questionnaireSchema.test.ts src/hooks/useQuizSession.test.tsx src/utils/resultsTransfer.test.ts`
- [x] `npm run build`

## Playwright CLI checks
- [ ] N/A для задачи runtime/sandbox. По запросу пользователя `playwright-cli` не запускался в этом цикле.

## Evidence
- `vitest`: 4 files, 22 tests, all passed.
- `build:full`: successful.
