# QA

## Automated checks
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Smoke checks
- Root app routes открываются без runtime ошибок.
- При отсутствии `VITE_GA_MEASUREMENT_ID` GA не инициализируется.
