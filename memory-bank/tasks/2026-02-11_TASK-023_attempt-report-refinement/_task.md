# TASK-023 — Attempt Report Refinement

## Goal
Привести отчеты к пользовательскому сценарию: отчет формируется по одной оценке, без технических полей `ID` вопроса, без пустых блоков комментария/фото, с двумя текстовыми экспортами.

## Linked Requirements
- `UR-060`
- `UR-061`
- `UR-062`
- `UR-063`

## Deliverables
- Переключение report-builder на attempt-level.
- Экспорт «Скачать текст» и «Скачать текст без оформления».
- Обновленные i18n подписи для report actions.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, Playwright smoke)
