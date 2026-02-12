# TASK-040 — Shadcn-Style Range Picker For Analytics

## Goal
Заменить два date-input в аналитике на shadcn-style range picker (Calendar + Popover), сохранив фильтрацию по периоду и улучшив эргономику выбора дат.

## Linked Requirements
- `UR-034`, `UR-050`, `UR-051`: аналитика и динамика по времени.
- `WF-008`: UI изменения подтверждаются Playwright.

## Deliverables
- Новый UI компонент выбора диапазона дат на базе `react-day-picker`.
- Интеграция range picker в analytics filter panel.
- Обновленные i18n ключи и coverage.
- Playwright артефакты открытия popover, выбора диапазона и итогового filtered state.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright validation)
