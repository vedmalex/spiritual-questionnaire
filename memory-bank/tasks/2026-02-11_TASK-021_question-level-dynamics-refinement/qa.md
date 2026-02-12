# QA

## Automated checks
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Smoke verification
- Dashboard / Questionnaire stats:
  - при 2+ ответах по вопросу виден блок `История изменения оценки` и график.
  - при 1 ответе отображается сообщение о недостаточности данных для динамики.
