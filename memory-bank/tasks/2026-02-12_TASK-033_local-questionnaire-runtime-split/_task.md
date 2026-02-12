# TASK-033 — Local Questionnaire Runtime Split

## Goal
Исправить конфликт, когда локально импортированный опросник с тем же `quality`, что и встроенный, скрывает встроенный в списке студента.

## Linked Requirements
- `UR-030`: динамическая загрузка опросников без redeploy.
- `WF-008`: UI changes validated with Playwright.

## Deliverables
- В UI одновременно отображаются встроенный и локальный опросники.
- Для локальной версии отображается явная метка `(локальный)`.
- Ответы/сессии локальной версии изолированы от встроенной за счет отдельного runtime-id.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright validation)
