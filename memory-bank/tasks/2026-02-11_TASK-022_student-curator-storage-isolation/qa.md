# QA

## Automated checks
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Manual expectations
- В режиме куратора не отображаются student personal results по умолчанию.
- После импорта student answers в куратора они сохраняются и читаются только из curator scope.
- При logout:
  - общий backup сохраняется всегда;
  - отдельный curator backup сохраняется только когда есть curator данные.
