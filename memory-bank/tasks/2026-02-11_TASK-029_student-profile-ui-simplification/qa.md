# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Student flow smoke with new profile/settings + analytics tab + import defaults.
- [x] Curator flow smoke with fixed defaults and no technical selectors.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`).
- Target URL: `http://localhost:3000` (`vite preview`).
- Result: ✅ Passed (student + profile + analytics + curator defaults scenarios).

## Evidence
- Student questionnaire list (no internal questionnaire id line):
  - `output/playwright/2026-02-11-task-029-profile-ui/step-01-student-questionnaire-list.png`
  - `output/playwright/2026-02-11-task-029-profile-ui/snapshot-student-list.yml`
- Dashboard analytics tab (separate dynamics tab + usage counter):
  - `output/playwright/2026-02-11-task-029-profile-ui/step-02-dashboard-analytics-tab.png`
  - `output/playwright/2026-02-11-task-029-profile-ui/snapshot-dashboard-analytics.yml`
- Profile page (name edit + centralized settings):
  - `output/playwright/2026-02-11-task-029-profile-ui/step-03-profile-settings.png`
  - `output/playwright/2026-02-11-task-029-profile-ui/snapshot-profile.yml`
- Curator dashboard defaults (no format/strategy selectors, JSON+replace note):
  - `output/playwright/2026-02-11-task-029-profile-ui/step-04-curator-defaults.png`
  - `output/playwright/2026-02-11-task-029-profile-ui/snapshot-curator-defaults.yml`

## Observation
- В `vite preview` виден один console error `Minified React error #418` (hydration warning context), но сценарии UI проходят полностью и ожидаемое поведение подтверждено артефактами.
