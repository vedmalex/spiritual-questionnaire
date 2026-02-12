# Implementation Notes

## Vite Plugin
- В `vite.config.ts` добавлен plugin `questionnairesIndexPlugin()`.
- Plugin вызывает генерацию индекса:
  - на `buildStart` (гарантия перед сборкой),
  - при старте dev-сервера,
  - при событиях watcher `add/unlink/change` в `public/questionnaires`.

## Index Generation Logic
- Генератор собирает только `*.json` файлы из `public/questionnaires`.
- `index.json` исключается из списка.
- Список сортируется и записывается в `index.json`.
- Запись выполняется только если контент реально изменился.

## Concurrency Safety
- Добавлен in-flight guard `generationInFlight`, чтобы параллельные watcher-события не запускали генерацию одновременно.
