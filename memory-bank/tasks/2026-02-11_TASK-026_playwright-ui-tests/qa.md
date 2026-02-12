# QA

## Smoke Execution
- Tooling: Playwright CLI via wrapper (`playwright` skill).
- Session: `task026`.
- App target: `http://127.0.0.1:3000`.
- Artifacts: `output/playwright/2026-02-11-task-026-smoke`.

## Findings (ordered by severity)
1. `P1` Pause/Resume regression (`UR-012`): нажатие `Продолжить` в блоке paused session не открывает quiz flow, UI остается на list-view.
   - Evidence:
     - paused banner visible: `output/playwright/2026-02-11-task-026-smoke/step-04-paused-banner.png`
     - post-click snapshot still list-view: `output/playwright/2026-02-11-task-026-smoke/.playwright-cli/page-2026-02-11T20-08-47-148Z.yml`
   - Candidate code area:
     - `src/routes/index.tsx:343`
     - `src/routes/index.tsx:381`

## Passed Smoke Checks
- Setup -> student entry form.
- Start quiz flow.
- Pause banner visibility.
- Student -> curator role switch.
- Curator -> admin role switch.
- Admin operations tab visibility.
- Logout backup download + return to setup screen.

## Coverage Summary
- Total smoke scenarios executed: `8`
- Passed: `7`
- Failed: `1`
- Blocker status: `open` (resume flow regression)
