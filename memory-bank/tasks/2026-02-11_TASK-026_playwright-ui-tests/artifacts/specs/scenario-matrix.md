# Playwright UI Scenario Matrix (Task-026)

## Scope
- Tooling: `playwright` skill, CLI-first workflow via wrapper script.
- App target: local dev app at `http://127.0.0.1:3000`.
- Artifacts root: `output/playwright/2026-02-11-task-026-smoke`.

## Scenario Matrix

| ID | Flow | Linked UR | Status | Evidence |
| --- | --- | --- | --- | --- |
| `PW-SMOKE-01` | Anonymous setup -> student profile entry | `UR-003` | ✅ Pass | `step-01-setup.png`, `step-02-student-list.png` |
| `PW-SMOKE-02` | Student start questionnaire -> active quiz screen | `UR-005`, `UR-013` | ✅ Pass | `step-03-quiz-active.png` |
| `PW-SMOKE-03` | Pause flow -> paused banner visible | `UR-012` | ✅ Pass | `step-04-paused-banner.png` |
| `PW-SMOKE-04` | Resume from paused banner (`Продолжить`) | `UR-012`, `UR-011` | ❌ Fail | Snapshot after click remains on list (`.playwright-cli/page-2026-02-11T20-08-47-148Z.yml`) |
| `PW-SMOKE-05` | Role switch student -> curator | `UR-004`, `UR-023`, `UR-053` | ✅ Pass | `step-05-curator-dashboard.png` |
| `PW-SMOKE-06` | Role switch curator -> admin | `UR-004`, `UR-036` | ✅ Pass | `step-06-admin-overview.png` |
| `PW-SMOKE-07` | Admin operations tab (`Миграции и сверка`) visibility | `UR-036` | ✅ Pass | `step-07-admin-operations.png` |
| `PW-SMOKE-08` | Logout export + return to setup screen | `UR-044` | ✅ Pass | `step-08-post-logout-setup.png`, `user-backup-sample.json` |

## Deferred (Next Iteration)
- `PW-REG-09`: student dashboard report generation + text/plain-text actions (`UR-057`, `UR-062`, `UR-063`).
- `PW-REG-10`: curator import/export roundtrip with fixture payload (`UR-054`, `UR-055`).
- `PW-REG-11`: student/curator storage isolation check after role switches (`UR-058`, `UR-059`).
