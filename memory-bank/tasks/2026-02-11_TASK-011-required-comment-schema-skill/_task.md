# TASK-011 — Required Comment Flag in Question Schema + Skill Sync

## Goal
Добавить в схему вопроса флаг обязательного письменного комментария и синхронизировать требования skill `spiritual-questionnaire-architect` с текущим приложением.

## Linked Requirements
- `UR-056`: Вопрос поддерживает `requires_comment`; при `true` письменный комментарий обязателен для продолжения.
- Alignment: `spiritual-questionnaire-architect` должен выдавать JSON, совместимый с приложением.

## Deliverables
- Поддержка `requires_comment` в type/schema/normalization/editor/quiz runtime.
- Блокирующая проверка в UI прохождения опроса при `requires_comment=true` и пустом комментарии.
- Обновление `SKILL.md` с новым полем и app-compatibility требованиями.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npx tsc --noEmit`, `npm run build`)
