# TASK-017 — LEVER Reuse: Form Primitives + Shared Selectors

## Goal
Закрыть открытые LEVER-пункты по переиспользованию UI-компонентов (`LEV-001`, `LEV-002`).

## Linked Requirements
- `LEV-001`: Extract reusable form primitives for editor/translation tool/admin forms.
- `LEV-002`: Shared role/language selector component for `Header` and `UserSetup`.

## Deliverables
- `src/components/ui/FormPrimitives.tsx`.
- `src/components/ui/ProfileSelectors.tsx`.
- Интеграция в `QuestionnaireEditor`, `TranslationManager`, `AdminDashboard`, `Header`, `UserSetup`.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`)
