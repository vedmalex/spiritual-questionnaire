# TASK-024 — GA Analytics Integration

## Goal
Добавить отслеживание активности пользователей по страницам/формам через Google Analytics (GA) с опциональной активацией через env.

## Linked Requirements
- `UR-064`

## Deliverables
- Инициализация GA только при наличии `VITE_GA_MEASUREMENT_ID`.
- Отправка page-view событий при переходах между route.
- Базовая документация по env-конфигурации.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`, Playwright smoke)
