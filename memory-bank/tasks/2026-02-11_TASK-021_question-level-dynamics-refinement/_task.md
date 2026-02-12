# TASK-021 — Question-Level Dynamics Refinement

## Goal
Синхронизировать реализацию динамики с пользовательской трактовкой: в self-assessment нужно показывать изменение оценки во времени по каждому вопросу выбранного опросника, а не только агрегированный средний показатель.

## Linked Requirements
- `UR-034`: статистика по выбранному опроснику на уровне списка вопросов.
- `UR-050`: динамика оценок во времени.

## Deliverables
- UI блока динамики вопросов с историей оценок по датам.
- Порог отображения динамики: минимум 2 оценки по вопросу.
- Обновленные i18n ключи и coverage.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, Playwright smoke)
