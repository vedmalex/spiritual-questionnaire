# QA

## Manual/Smoke verification
- Playwright smoke (headless):
  - `RU` title: `Личный кабинет`
  - после клика `EN` без reload: `Personal Dashboard`
  - после reload: `Personal Dashboard`

## Automated checks
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass
