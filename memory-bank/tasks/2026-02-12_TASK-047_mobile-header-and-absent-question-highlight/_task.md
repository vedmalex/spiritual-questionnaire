# TASK-047 — Mobile Header Consistency + Absent Question Highlight

## Goal
Привести mobile header к консистентному виду на малых экранах и упростить отображение отсутствующих вопросов в истории результатов:
- компактный header включается раньше;
- сообщение про отсутствующие вопросы остается коротким;
- отсутствующие вопросы выделяются цветной рамкой без отдельного бейджа в каждой строке.

## Linked Requirements
- `WF-008`: UI изменения подтверждаются `playwright-cli`.

## Deliverables
- Обновленный responsive header (`src/components/Header.tsx`) для малых экранов.
- Упрощенный absent-визуал в dashboard (`src/components/Dashboard.tsx` + `src/utils/i18n.ts`).
- Playwright CLI проверка мобильного overflow/overlay.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, playwright-cli checks)

