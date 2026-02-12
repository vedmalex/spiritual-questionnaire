# Plan

1. Реализовать утилиту отслеживания изменений `questionnaires/index.json` в PWA mode.
2. Добавить механизм показа notification (SW registration fallback/new Notification).
3. Подключить сервис в root lifecycle приложения.
4. Добавить i18n keys для текстов notification (RU/EN) и типы.
5. Добавить unit tests для pure-логики обнаружения новых файлов.
6. Прогнать `npm test` и `npm run build`.
7. Выполнить Playwright сценарий с моками notification и зафиксировать артефакты.
