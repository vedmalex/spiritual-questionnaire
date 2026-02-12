# Implementation Notes

## Scope
- Runtime-only enhancement: уведомления о новых опросниках в установленном PWA.

## Runtime Changes
- Добавлен сервис `src/utils/questionnaireUpdateNotifications.ts`:
  - периодическая проверка `/questionnaires/index.json` (polling каждые 5 минут),
  - сравнение с локальным snapshot,
  - обнаружение новых файлов опросников,
  - показ system notification через `ServiceWorkerRegistration.showNotification` (fallback на `new Notification`).
- Сервис активируется только в PWA display-mode (`standalone/fullscreen/minimal-ui` + iOS standalone).
- Добавлен lifecycle-start в `src/routes/__root.tsx`:
  - `startQuestionnaireUpdateNotifications()` стартует на root mount и корректно очищается на unmount.

## Persistence
- Добавлены storage keys в `src/utils/constants.ts`:
  - `STATIC_QUESTIONNAIRE_INDEX_SNAPSHOT`
  - `QUESTIONNAIRE_NOTIFICATION_PERMISSION_PROMPTED`
- Snapshot хранит текущий список файлов index + timestamp, чтобы не отправлять повторные уведомления на каждую проверку.

## i18n
- Добавлены translation keys (RU/EN):
  - `pwa.updates.title`
  - `pwa.updates.body`
- Обновлен тип-контракт `src/types/i18n.ts`.

## Service Worker
- В `public/sw.js` добавлен `notificationclick` handler:
  - фокус существующего окна приложения или openWindow `./`.

## Tests
- Добавлен unit-test файл `src/utils/questionnaireUpdateNotifications.test.ts`:
  - normalizer для payload index,
  - определение новых файлов по сравнению snapshot/current index.

## Documentation
- `README.md` дополнен секцией `PWA Update Notifications`.
