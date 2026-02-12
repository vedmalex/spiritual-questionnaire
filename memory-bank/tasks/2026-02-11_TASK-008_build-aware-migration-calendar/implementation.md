# Implementation Notes

## Completed
- Build-aware migration:
  - `src/utils/constants.ts`: добавлен `APP_BUILD_ID`.
  - `vite.config.ts`: добавлен build-time injection для `VITE_APP_BUILD_ID`.
  - `src/services/dataAdapter.ts`: добавлены `getBuildId/setBuildId`.
  - `src/services/localStorageAdapter.ts`: app state read/write helper + build id persistence.
  - `src/services/migration.ts`: миграции выполняются не только по `DATA_VERSION`, но и при смене build id; добавлен schema reconciliation pass.

- Merge из разных источников:
  - `src/utils/resultsTransfer.ts`: fingerprint-дедупликация импортируемых результатов в `mergeImportedResults`.

- Графики и аналитика:
  - `src/components/ScoreChart.tsx` полностью переработан:
    - убраны категории low/medium/high,
    - используется шкала 0..10 с описаниями,
    - добавлена динамика по дням,
    - добавлена календарная навигация по месяцам.

- Редактор опросников:
  - `src/components/QuestionnaireEditor.tsx` переведен на динамические языки:
    - добавление/удаление языков,
    - поля вопроса генерируются по текущему списку языков,
    - импорт/экспорт сохраняет многоязычную структуру.

- Панель переводов:
  - `src/components/TranslationManager.tsx`: автоподгрузка текущего набора переводов выбранного языка и явная кнопка "Подгрузить текущие".

## Key References
- `src/services/migration.ts`
- `src/services/localStorageAdapter.ts`
- `src/services/dataAdapter.ts`
- `src/utils/constants.ts`
- `vite.config.ts`
- `src/components/ScoreChart.tsx`
- `src/components/QuestionnaireEditor.tsx`
- `src/components/TranslationManager.tsx`
- `src/utils/resultsTransfer.ts`
