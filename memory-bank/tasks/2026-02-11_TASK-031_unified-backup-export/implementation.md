# Implementation Notes

## Logout Export
- В `src/hooks/useUser.ts` удалена отдельная curator выгрузка (`downloadCuratorBackupFile`).
- Logout теперь всегда скачивает только `downloadUserBackupFile(payload)`.
- Общий payload уже содержит оба массива: `results` и `curatorResults`.

## Backup Parser Compatibility
- В `src/utils/userBackup.ts` добавлена поддержка legacy типа `spiritual-questionnaire-curator-backup`.
- При импорте legacy curator файла он нормализуется в общий `UserBackupPayload`:
  - `results: []`
  - `curatorResults` заполняется из legacy payload
  - `session: null`, `customQuestionnaires: []`

## Tests
- Добавлен `src/utils/userBackup.test.ts`:
  - проверка единого payload с student+curator данными,
  - проверка совместимости с legacy curator-only backup.

## UX Copy Update
- В `src/utils/i18n.ts` обновлены тексты `profile.transfer.export/import` (RU/EN):
  - export = единый JSON,
  - import = автоопределение ролей/данных + replace duplicates.
