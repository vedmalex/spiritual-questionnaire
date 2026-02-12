# TASK-018 — Questionnaire Readable Report

## Goal
Добавить подготовку оформленного отчета по выбранному опроснику с возможностью чтения в приложении, экспорта в Markdown и печати из того же шаблона.

## Linked Requirements
- `UR-057`: readable report + markdown export + print template.

## Deliverables
- Генератор отчета: markdown + printable HTML.
- UI в dashboard: выбор опросника и подготовка отчета.
- Выгрузка markdown-файла.
- Печать отчета через print-friendly шаблон.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run audit:mobile`)
