# QA

## Verification
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass
- `npm run audit:mobile` — ✅ pass

## Notes
- Отчет формируется по выбранному опроснику (группа результатов), содержит текст/баллы/комментарии/фото.
- Markdown и printable HTML собираются из одной модели данных.
