# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Проверен сценарий: в localStorage есть student results, но `spiritual_questionnaire_user` отсутствует.
- [x] При прямом заходе на `/dashboard` происходит возврат на `/` (setup форма), результаты не отображаются.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Base URL: `http://127.0.0.1:3000`
- Проверки:
  - `window.location.pathname === '/'`
  - `Boolean(document.querySelector('#name')) === true`
  - `document.body.innerText` не содержит `Мои результаты`/`My Results`
- Result: ✅ Passed

## Evidence
- `output/playwright/2026-02-11-task-030-role-gate/step-01-dashboard-redirect-to-setup.png`
- `output/playwright/2026-02-11-task-030-role-gate/snapshot-dashboard-open.yml`
- `output/playwright/2026-02-11-task-030-role-gate/snapshot-root-before-seed.yml`
