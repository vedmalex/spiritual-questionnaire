# Plan

1. Проверить текущий build-output и зафиксировать blockers для static-only deployment.
2. Включить SPA mode в `tanstackStart` и обеспечить генерацию `index.html` в client-output.
3. Добавить `404.html` fallback генерацию для deep-link открытия на статическом хостинге.
4. Внедрить PWA assets: `manifest.webmanifest`, service worker, offline page, регистрация SW в runtime.
5. Создать и подключить новую иконку `QWIZ` (192/512, maskable, apple touch, favicon).
6. Обновить README c инструкцией публикации на статическом хостинге и PWA checklist.
7. Выполнить QA (`npm test`, `npm run build`, Playwright run) и сохранить артефакты.
