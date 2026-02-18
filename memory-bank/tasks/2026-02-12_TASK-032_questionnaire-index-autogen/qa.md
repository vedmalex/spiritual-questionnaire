# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Runtime Verification (dev)
- [x] Запущен `npm run dev`.
- [x] Добавлен временный файл `public/questionnaires/autogen-watch-check.json`.
- [x] `public/questionnaires/index.json` автоматически обновился и включил новый файл.
- [x] После удаления временного файла `index.json` автоматически вернулся к исходному списку.

## Follow-up Verification (nested folders)
- [x] Опросники перенесены в подпапки `public/questionnaires/Урок№1` и `public/questionnaires/Урок№2`.
- [x] `public/questionnaires/index.json` содержит относительные nested-пути, а не пустой массив.
- [x] Загрузка опросников из `index.json` работает для nested-путей (`npm test`, `npm run build`).

## Result
- ✅ Механизм авто-генерации работает для build и dev-watch.
