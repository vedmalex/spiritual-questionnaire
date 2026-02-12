# QA

## Verification
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass
- `npm run audit:mobile` — ✅ pass

## Notes
- Исправлен сценарий, когда часть компонентов оставалась на старом языке до ручного reload.
- Dashboard/ScoreChart больше не дают критичного RU/EN mixed-state при переключении языка.
