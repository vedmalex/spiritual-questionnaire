# QA

## Automated checks
- [x] `npm run docs:user-manual:screenshots`

## Playwright CLI checks
- [x] Student screenshots generated (`desktop/mobile`)
- [x] Curator screenshots generated (`desktop/mobile`)
- [x] Admin screenshots generated (`desktop/mobile`)
- [x] Evidence manifest produced

## Canonical flow checks
- [x] `docs/testing/user-flow-baseline.md` содержит Flow ID для всех ключевых сценариев `student/curator/admin`.
- [x] Для каждого Flow ID добавлены ожидаемый результат и регрессионные чекпоинты.
- [x] Сценарии покрывают both `desktop` и `mobile`.
- [x] В `WORKFLOW` закреплена обязательная привязка UI-QA к Flow ID.

## Evidence
- `docs/guides/assets/user-manual/student-desktop.png`
- `docs/guides/assets/user-manual/student-mobile.png`
- `docs/guides/assets/user-manual/curator-desktop.png`
- `docs/guides/assets/user-manual/curator-mobile.png`
- `docs/guides/assets/user-manual/admin-desktop.png`
- `docs/guides/assets/user-manual/admin-mobile.png`
- `output/playwright/2026-02-12-task-059-user-manual/assert.json`
