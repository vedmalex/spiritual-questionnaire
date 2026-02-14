# TASK-061 - Global Playwright Flow Scenario Skill

## Goal
Create a reusable global skill that converts requirements/flows into executable `scenario-pack.json` and runs artifact collection (`screenshots`, `assert.json`, `report.md`) through `playwright-cli`.

## Scope
- Build global skill in `agent-skills` workspace.
- Support input as requirements markdown or structured flows json.
- Ensure output contract is JSON consumed by collector script.
- Validate with end-to-end smoke run against `spiritual-questionnaire` app.

## Deliverables
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/SKILL.md`
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/generate-flow-scenario-pack.mjs`
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/collect-flow-artifacts.mjs`
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/run-flow-artifacts.sh`
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/references/scenario-pack-schema.md`
- `/Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/assets/*.json`

## Status
- Implementation: Completed
- QA: Completed
