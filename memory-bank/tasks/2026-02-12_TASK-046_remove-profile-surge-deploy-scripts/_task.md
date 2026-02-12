# TASK-046 — Remove Profile-Split Surge Deploy Scripts

## Goal
Убрать из проекта npm-скрипты раздельной публикации по профилям и публикацию на `surge.sh`, оставив актуальный deployment path через GitHub Pages/full build.

## Deliverables
- Удалены `deploy:*:surge` и `deploy:surge` из `package.json`.
- README обновлен: публикация указана только для `dist/full/client`.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`)

