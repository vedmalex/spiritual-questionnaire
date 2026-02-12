# Implementation Notes

## Completed
- Полностью обновлен `src/components/CuratorDashboard.tsx`.
- Добавлены grouped sections:
  - активные группы проверки,
  - завершенные группы проверки,
  - grouping key: `questionnaireId + normalized userName`.
- Добавлена операционная панель куратора:
  - импорт student answers (`importAllResults`) с выбором стратегии merge,
  - экспорт всех проверенных результатов,
  - экспорт проверенных результатов конкретной группы для передачи студенту.
- Сохранена существующая логика review:
  - смена статуса проверки,
  - добавление curator feedback,
  - просмотр фото/комментариев.
- Устранен конфликт выбора textarea feedback между разными результатами:
  - target теперь привязан к `resultId + questionId`.

## Key References
- `src/components/CuratorDashboard.tsx`
- `src/hooks/useResults.ts`
- `src/utils/exportUtils.ts`
