# Playwright CLI Runbook (Task-026)

## Preconditions
1. Local app is running on `http://127.0.0.1:3000`.
2. `npx` is available.
3. Wrapper script path:
   - `/Users/vedmalex/work/agent-skills/skills/playwright/scripts/playwright_cli.sh`

## Session Setup
```bash
cd /Users/vedmalex/work/ai-questionary/spiritual-questionnaire/output/playwright/2026-02-11-task-026-smoke
export PWCLI=/Users/vedmalex/work/agent-skills/skills/playwright/scripts/playwright_cli.sh
export PLAYWRIGHT_CLI_SESSION=task026
"$PWCLI" open http://127.0.0.1:3000
"$PWCLI" snapshot
```

## Interaction Pattern
Use loop:
1. `snapshot`
2. `click/fill/...`
3. `snapshot`
4. `screenshot`

Example:
```bash
"$PWCLI" snapshot
"$PWCLI" click e75
"$PWCLI" snapshot
"$PWCLI" screenshot
```

## Completed Smoke Steps
1. Setup and student entry form.
2. Student list and quiz start.
3. Pause flow and paused banner.
4. Resume attempt from paused banner (`Продолжить`) -> failed (stayed on list).
5. Role switch to curator.
6. Role switch to admin and open operations tab.
7. Logout and backup download verification.

## Artifact Policy
- All raw snapshots/screenshots/downloads are kept in:
  - `output/playwright/2026-02-11-task-026-smoke/.playwright-cli/`
- Curated artifacts copied to:
  - `output/playwright/2026-02-11-task-026-smoke/step-*.png`
  - `output/playwright/2026-02-11-task-026-smoke/user-backup-sample.json`

## Session Teardown
```bash
"$PWCLI" close
```
