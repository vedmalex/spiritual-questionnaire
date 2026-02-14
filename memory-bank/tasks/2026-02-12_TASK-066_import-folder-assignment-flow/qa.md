# QA

## Automated checks
- [x] `npm test`
- [x] `npm run build`

## Playwright CLI checks
- [ ] Отложено по явному запросу пользователя на текущем этапе (без запуска playwright-cli).

## Evidence
- UI behavior implemented and covered by integration path:
  - import payload parsing + unknown student detection,
  - assignment modal (existing/new folder),
  - sticky assignment apply.
- Related unit tests:
  - `src/utils/curatorResultFolders.test.ts`
  - `src/services/localStorageAdapter.test.ts`
- Build/test logs:
  - `npm test` (53/53 tests passed)
  - `npm run build` (full profile build passed)
