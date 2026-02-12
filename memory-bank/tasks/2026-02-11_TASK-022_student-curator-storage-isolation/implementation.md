# Implementation Notes

## Storage isolation
- `src/services/dataAdapter.ts`
  - Добавлен тип `ResultsScope = 'student' | 'curator'`.
  - Results API расширен параметром `scope`.
- `src/services/localStorageAdapter.ts`
  - Добавлены scoped keys:
    - `spiritual_questionnaire_results_student`
    - `spiritual_questionnaire_results_curator`
  - `student` scope поддерживает fallback к legacy key для совместимости.

## Hook / UI integration
- `src/hooks/useResults.ts`
  - Поддержка `scope` и owner-фильтра для student.
- `src/components/CuratorDashboard.tsx`
  - Используется `useResults('curator')`.
- `src/routes/dashboard.tsx`
  - Student route использует owner-aware student scope.

## Backup behavior
- `src/utils/userBackup.ts`
  - Общий backup обновлен до `v1.1.0` (включает `curatorResults`).
  - Добавлен отдельный `curator backup` payload/file.
- `src/hooks/useUser.ts`
  - Logout:
    - всегда экспортирует общий backup;
    - дополнительно экспортирует `curator-backup-*.json`, если `curatorResults.length > 0`.
  - Restore восстанавливает `student` и `curator` scopes раздельно.

## Migration
- `src/services/migration.ts`
  - `DATA_VERSION=4`.
  - v4 migration:
    - переносит legacy results в `student` scope;
    - инициализирует `curator` scope пустым массивом;
    - удаляет legacy key.
