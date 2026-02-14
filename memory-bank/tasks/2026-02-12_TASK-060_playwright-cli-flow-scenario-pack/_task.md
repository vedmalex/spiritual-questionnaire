# TASK-060 — Playwright CLI Flow Scenario Pack

## Goal
Подготовить отдельный сценарный пакет для skill `playwright` в режиме `playwright-cli`, который проходит канонические пользовательские потоки (`Flow ID`) и снимает скриншоты/assert-артефакты для UI/UX regression.

## Linked Requirements
- `UR-097`
- `UR-098`
- `UR-099`
- `WF-010`

## Deliverables
- Сценарный файл: `docs/testing/playwright-cli-flow-scenarios.json`.
- Руководство: `docs/testing/playwright-cli-flow-scenarios.md`.
- Runner script: `scripts/playwright-flow-scenarios.mjs`.
- CLI wrapper launcher: `scripts/run-playwright-flow-scenarios.sh`.
- NPM command: `npm run test:ui:flow-scenarios`.
- Артефакты прогона: `output/playwright/2026-02-12-task-060-playwright-cli-flow-scenarios/`.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed
- Follow-up: 🔁 Update scenarios when `Flow ID` behavior changes.
