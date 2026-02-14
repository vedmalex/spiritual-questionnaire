# QA

## Automated checks
- [x] `npm test`
- [x] `npm run build`

## Playwright CLI checks
- [ ] Отложено по явному запросу пользователя на текущем этапе (без запуска playwright-cli).

## Evidence
- Unit tests:
  - `src/utils/curatorResultFolders.test.ts`
  - `src/services/localStorageAdapter.test.ts` (curator folders persistence case)
  - `src/utils/userBackup.test.ts` (backup compatibility with curator folders)
- Build/test logs:
  - `npm test` (53/53 tests passed)
  - `npm run build` (full profile build passed)
