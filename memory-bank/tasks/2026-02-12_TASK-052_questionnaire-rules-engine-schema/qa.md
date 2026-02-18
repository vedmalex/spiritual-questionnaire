# QA

## Automated checks
- [x] `npm run test -- src/utils/questionnaireRules.test.ts src/utils/questionnaireSchema.test.ts src/hooks/useQuizSession.test.tsx src/utils/resultsTransfer.test.ts`
- [x] `npm run build`

## Playwright CLI checks
- [ ] N/A для этой задачи (изменения схемы/рантайма без UI-флоу). Отложено по явному запросу пользователя не запускать `playwright-cli` до отдельной команды.

## Evidence
- `vitest`: 4 files, 22 tests, all passed.
- `build:full`: successful (`vite build` + prerender + static fallback).
