# TASK-032 — Questionnaire index.json Autogeneration

## Goal
Автоматизировать формирование `public/questionnaires/index.json`:
- при `build` индекс формируется автоматически,
- в `dev` индекс обновляется при добавлении/удалении JSON-файлов в папке опросников.

## Linked Requirements
- `UR-030`: динамическая загрузка опросников без redeploy.

## Deliverables
- Vite plugin для авто-генерации `index.json`.
- Hook в dev-watch на события add/unlink/change JSON-файлов.
- Рекурсивный обход `public/questionnaires/**` с поддержкой вложенных папок в `index.json`.
- Проверка на build и в dev-режиме.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (`npm test`, `npm run build`, dev watch verification)
