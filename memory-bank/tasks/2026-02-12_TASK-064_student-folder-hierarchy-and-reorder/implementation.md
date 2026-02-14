# Implementation

## Scope
- Реализована иерархия student-папок для списка опросников (`UR-100`).
- Реализованы операции свободного перемещения опросников/папок, reorder внутри родителя и вложенные подпапки (`UR-101`).
- Добавлена персистентность структуры папок в `localStorage` с миграцией схемы и переносом через backup/archive.

## What Was Changed
- Data model:
  - Добавлены типы `StudentQuestionnaireFolder` и `StudentQuestionnaireFoldersState`.
  - Добавлен storage key `spiritual_questionnaire_student_questionnaire_folders`.
  - Добавлены методы adapter API:
    - `getStudentQuestionnaireFolders()`
    - `saveStudentQuestionnaireFolders(...)`
- Folder state engine:
  - Новый модуль `src/utils/studentQuestionnaireFolders.ts` (normalize, create/move/reorder/delete folder operations, parent options).
  - Новый unit test: `src/utils/studentQuestionnaireFolders.test.ts`.
- UI:
  - `src/components/QuestionnaireList.tsx` переведен в lightweight-режим:
    - компактный плиточный вид для больших экранов;
    - отдельный tree-view для просмотра и навигации;
    - без продвинутых действий редактирования на стартовой странице.
  - Продвинутое управление папками перенесено в админ-раздел:
    - новая вкладка `admin.tab.folders`;
    - новый компонент `src/components/StudentFolderManager.tsx` с перемещением/reorder;
    - модальный диалог профессионального уровня для создания папки с выбором папок/опросников для переноса.
  - Сохранена логика paused/local badges и запуска опросника.
- System vs user folders:
  - В `questionnaire` metadata добавлено `system_folders`.
  - В `studentQuestionnaireFolders` добавлена генерация системных папок из metadata и объединение с пользовательскими папками.
  - Системные папки помечаются как `kind: 'system'` и считаются read-only для rename/delete/reparent.
  - Переопределение размещения (опросников/пользовательских папок) выполняется через admin UI.
- Migration & compatibility:
  - `DATA_VERSION` повышен до `6`.
  - Добавлена migration v6 для нормализации student folder state.
  - Backup/archive расширены полем `studentQuestionnaireFolders` (`useUser`, `userBackup`, типы архива).
- i18n & docs:
  - Добавлены translation keys для folder UI (RU/EN) + типизация + translation coverage.
  - Обновлены flow docs для `STU-04` с учетом папок.

## Notes
- В рамках этого шага закрыт только `TASK-064`.
- `TASK-065` и `TASK-066` остаются отдельными следующими этапами.
