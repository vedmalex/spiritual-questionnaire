# QA

## Validation
- [x] Skill structure validation:
  - `python3 /Users/vedmalex/work/agent-skills/skills/skill-creator/scripts/quick_validate.py /Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder`
- [x] Generator help:
  - `node /Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/generate-flow-scenario-pack.mjs --help`
- [x] Collector help:
  - `node /Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/collect-flow-artifacts.mjs --help`
- [x] Generator smoke from canonical requirements:
  - Input: `/Users/vedmalex/work/ai-questionary/spiritual-questionnaire/docs/testing/user-flow-baseline.md`
  - Output: `/tmp/playwright-flow-scenario-builder-smoke/scenario-pack.json`
- [x] End-to-end artifact smoke run:
  - Command:
    - `PW_APP_START_CMD='cd /Users/vedmalex/work/ai-questionary/spiritual-questionnaire && npm run dev' PW_BASE_URL='http://localhost:3000' PW_FLOW_ARTIFACT_DIR='/tmp/playwright-flow-scenario-builder-smoke/artifacts' bash /Users/vedmalex/work/agent-skills/skills/playwright-flow-scenario-builder/scripts/run-flow-artifacts.sh /tmp/playwright-flow-scenario-builder-smoke/one-scenario-pack.json`
  - Result: `1/1 passed`, `0 failed`

## Evidence
- `/tmp/playwright-flow-scenario-builder-smoke/scenario-pack.json`
- `/tmp/playwright-flow-scenario-builder-smoke/artifacts/assert.json`
- `/tmp/playwright-flow-scenario-builder-smoke/artifacts/report.md`
- `/tmp/playwright-flow-scenario-builder-smoke/artifacts/screenshots/smoke-stu-01-desktop.png`
