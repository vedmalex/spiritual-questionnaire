# Implementation Notes

## Vite Plugin
- В `vite.config.ts` добавлен plugin `questionnairesIndexPlugin()`.
- Plugin вызывает генерацию индекса:
  - на `buildStart` (гарантия перед сборкой),
  - при старте dev-сервера,
  - при событиях watcher `add/unlink/change` в `public/questionnaires`.

## Index Generation Logic
- Генератор рекурсивно собирает `*.json` файлы из `public/questionnaires/**`.
- `index.json` исключается из списка.
- В `index.json` сохраняются относительные пути (например, `Урок№1/01-shama_questionnaire.json`).
- Список сортируется и записывается в `index.json`.
- Запись выполняется только если контент реально изменился.

## Concurrency Safety
- Добавлен in-flight guard `generationInFlight`, чтобы параллельные watcher-события не запускали генерацию одновременно.

## Follow-up 2026-02-18
- Исправлен дефект top-level-only сканирования: при размещении опросников только в подпапках индекс больше не становится пустым.
- В dev-watch добавлены события `addDir/unlinkDir`, чтобы индекс обновлялся и при изменениях структуры каталогов.
