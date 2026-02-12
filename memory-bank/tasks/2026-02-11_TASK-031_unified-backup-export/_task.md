# TASK-031 — Unified Backup Export on Logout

## Goal
Убрать двойную выгрузку backup-файлов при logout и оставить один общий JSON-файл, который содержит student + curator данные и восстанавливается одной операцией.

## Linked Requirements
- `UR-044`: backup выгрузка при logout и восстановление при входе.
- `UR-058`, `UR-059`: раздельные storage scopes student/curator без смешивания.
- `WF-008`: UI changes validated with Playwright.

## Deliverables
- Logout выгружает ровно один файл (`user-backup-*.json`).
- Единый backup содержит `results` (student) и `curatorResults`.
- Импорт поддерживает legacy curator-only backup (`spiritual-questionnaire-curator-backup`).

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, Playwright validation)
