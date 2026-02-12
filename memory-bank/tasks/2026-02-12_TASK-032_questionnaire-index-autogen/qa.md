# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Runtime Verification (dev)
- [x] Запущен `npm run dev`.
- [x] Добавлен временный файл `public/questionnaires/autogen-watch-check.json`.
- [x] `public/questionnaires/index.json` автоматически обновился и включил новый файл.
- [x] После удаления временного файла `index.json` автоматически вернулся к исходному списку.

## Result
- ✅ Механизм авто-генерации работает для build и dev-watch.
