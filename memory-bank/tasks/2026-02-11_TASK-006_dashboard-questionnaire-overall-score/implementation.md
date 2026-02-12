# Implementation Notes

## Completed
- Добавлена группировка результатов по `questionnaireId` в `src/components/Dashboard.tsx`.
- Для каждой группы считается общая оценка:
  - `overallPercentage`,
  - `overallScoreTen` (`X/10`),
  - `overallScoreLabel` через `getGradeDescription(...)`.
- В UI dashboard добавлен блок "Общая оценка по опроснику" с выводом словесной оценки и балла.
- История попыток отображается внутри карточки соответствующего опросника.

## Key References
- `src/components/Dashboard.tsx`
