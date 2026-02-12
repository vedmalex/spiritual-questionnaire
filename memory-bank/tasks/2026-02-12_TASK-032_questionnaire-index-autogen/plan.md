# Plan

1. Добавить генератор списка `*.json` из `public/questionnaires` (исключая `index.json`).
2. Встроить генерацию в Vite lifecycle, чтобы она выполнялась на `build`.
3. Добавить dev watcher, который обновляет `index.json` при add/unlink/change файлов опросников.
4. Проверить функциональность через `npm test`, `npm run build` и dev runtime проверку добавления/удаления файла.
