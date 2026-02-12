# TASK-041 — Surge Deploy Scripts (Student + Curator)

## Goal
Подготовить удобные npm-скрипты для деплоя на `surge.sh` двух профилей:
- student → `student_qwiz_2nd`
- curator → `curator_qwiz_2nd`

## Linked Requirements
- `UR-001`: отдельные deploy-профили для ролей.
- `WF-008`: изменения инфраструктурных скриптов должны быть проверяемыми.

## Deliverables
- `npm` scripts:
  - `deploy:student:surge`
  - `deploy:curator:surge`
  - `deploy:surge` (оба профиля подряд)
- Проверка профильных build-пайплайнов перед деплоем.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (profile builds passed)
