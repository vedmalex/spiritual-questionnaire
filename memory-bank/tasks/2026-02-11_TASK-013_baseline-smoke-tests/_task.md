# TASK-013 — Baseline Smoke Tests for Critical Flows

## Goal
Добавить базовые автоматизированные тесты для критичных flow, чтобы закрыть блок качества перед релизом.

## Linked Requirements
- Must-have `MH-002`: smoke tests для `useQuizSession`, `useResults`, `questionnaireSchema`, `resultsTransfer`.
- Bug `BUG-001`: устранить состояние "No test files found".

## Deliverables
- Набор smoke tests для целевых модулей.
- Валидная конфигурация Vitest для React hooks (`jsdom`, dedupe react/react-dom).
- `npm test` проходит успешно.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`)
