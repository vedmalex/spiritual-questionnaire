# Implementation Notes

## Completed (Step 1 / UR-036)
- Добавлена роль `admin` в доменную модель пользователя.
- Реализован admin-hub (`AdminDashboard`) как единая зона:
  - управление опросниками (встроенный `QuestionnaireEditor`),
  - управление переводами (встроенный `TranslationManager`),
  - операции данных (ручной запуск миграций + dry-run сверка import payload).
- Добавлены role-based ограничения доступа к `/editor` и `/translations` (admin-only).
- Обновлены role-switcher и роль при первичном входе (включен `admin`).

## Completed (Step 5 / UR-040)
- Добавлена миграционная аннотация результатов `absentInCurrentSchemaQuestionIds`:
  - локальная миграция `v3`,
  - нормализация после import/merge.
- В student и curator dashboards добавлена визуальная пометка удаленных в текущей схеме вопросов.
- При экспорте CSV добавлен признак `Absent In Current Schema`.
- Для активной сессии при миграции добавлено выравнивание `currentQuestionIndex` под актуальную длину опросника.

## Completed (Step 6 / UR-041)
- Добавлена pre-load reconciliation проверка непосредственно в pipeline импорта результатов.
- Импорт теперь блокируется до записи в storage, если payload ссылается на отсутствующий в текущих схемах опросник.
- Для удаленных в текущей схеме вопросов импорт не блокируется (warning), а данные сохраняются с маркировкой `absentInCurrentSchemaQuestionIds`.

## Remaining
- `UR-037`, `UR-038`, `UR-039`, `UR-042`
