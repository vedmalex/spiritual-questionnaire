# Roundtrip Evidence (TASK-028)

## Scenario
`export -> transfer payload -> import -> verify` across two independent Playwright browser sessions.

## Source Session (`task028a`)
1. Open app and create user `Roundtrip A`.
2. Complete questionnaire `titiksha` (3 answers).
3. Export all results.
4. Save exported payload as:
   - `output/playwright/2026-02-11-task-028-roundtrip/transfer-payload.json`

## Target Session (`task028b`)
1. Open app in separate browser session.
2. Confirm empty dashboard before import:
   - `output/playwright/2026-02-11-task-028-roundtrip/.playwright-cli/page-2026-02-11T20-30-40-623Z.yml` (`Мои результаты (0)`).
3. Import `transfer-payload.json`.
4. Confirm success summary and visible imported attempt:
   - `output/playwright/2026-02-11-task-028-roundtrip/.playwright-cli/page-2026-02-11T20-33-11-364Z.yml` (`Мои результаты (1)`).

## Conclusion
Two-browser manual roundtrip validated; `TASK-003` QA follow-up is closed.
