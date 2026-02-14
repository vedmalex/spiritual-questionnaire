# Implementation

## Scope
- Реализована иерархия кураторских папок в `CuratorDashboard`.
- Добавлены агрегаты по папкам:
  - количество уникальных студентов,
  - количество свежих непроверенных работ (pending/in_review).
- Реализована sticky-маршрутизация по студенту: назначение папки сохраняется и используется для новых работ.

## What Was Changed
- Data model / state engine:
  - Добавлены типы `CuratorResultFolder`, `CuratorResultFoldersState`.
  - Новый модуль `src/utils/curatorResultFolders.ts`:
    - normalize/repair состояния,
    - операции с папками (create/rename/delete/move),
    - операции назначения студентов в папки,
    - parent options для UI.
- Persistence:
  - Новый storage key: `spiritual_questionnaire_curator_result_folders`.
  - Расширен `DataAdapter` и `LocalStorageAdapter` методами:
    - `getCuratorResultFolders()`
    - `saveCuratorResultFolders(...)`
  - Добавлена migration `v7` для нормализации curator folder state.
- Curator UI:
  - `src/components/CuratorDashboard.tsx` обновлен:
    - древо папок с раскрытием/сворачиванием,
    - counters по папкам,
    - выбор активной папки и фильтрация групп,
    - создание/переименование/удаление/перемещение папок,
    - назначение папки для группы студента (ручная переупаковка).
- Backup/archive compatibility:
  - `userBackup` и `useUser` расширены полем `curatorResultFolders`.
  - Состояние кураторских папок переносится через backup/archive.

## Notes
- Реализация `TASK-065` выполнена вместе с `TASK-066` (import assignment flow), так как сценарии тесно связаны одним состоянием папок.
