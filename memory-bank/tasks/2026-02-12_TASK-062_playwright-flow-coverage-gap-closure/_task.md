# TASK-062 — Playwright Flow Coverage Gap Closure

## Goal
Проверить покрытие `Flow ID` из канонического `docs/testing/user-flow-baseline.md` в `playwright-cli` scenario-pack и закрыть отсутствующие сценарии.

## Scope
- Сверка `Flow ID` manual vs scenario-pack.
- Добавление отсутствующих сценариев в `docs/testing/playwright-cli-flow-scenarios.json`.
- Расширение runner presets для новых действий в flow (`STU-10`).
- Прогон полного набора сценариев и фиксация артефактов.

## Deliverables
- `docs/testing/playwright-cli-flow-scenarios.json` (v1.1.0)
- `scripts/playwright-flow-scenarios.mjs`
- `docs/testing/playwright-cli-flow-scenarios.md`
- `output/playwright/2026-02-12-task-060-playwright-cli-flow-scenarios/assert.json`
- `output/playwright/2026-02-12-task-060-playwright-cli-flow-scenarios/report.md`

## Status
- Implementation: Completed
- QA: Completed
