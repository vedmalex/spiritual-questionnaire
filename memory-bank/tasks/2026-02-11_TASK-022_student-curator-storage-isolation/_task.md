# TASK-022 — Student/Curator Storage Isolation

## Goal
Разделить хранение student-результатов и curator-результатов, чтобы в панели куратора не показывались личные данные студента текущего пользователя; добавить отдельный backup-файл профиля куратора при logout, если кураторские данные существуют.

## Linked Requirements
- `UR-058`: раздельное хранилище результатов student/curator.
- `UR-059`: отдельный curator backup export на logout при наличии данных.

## Deliverables
- Scope-aware operations в data adapter и hooks.
- CuratorDashboard читает только `curator` scope.
- Logout flow экспортирует общий backup + curator backup (условно).
- Migration v4 переносит legacy results в student scope и инициализирует curator scope отдельно.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npx tsc --noEmit`, `npm run build`)
