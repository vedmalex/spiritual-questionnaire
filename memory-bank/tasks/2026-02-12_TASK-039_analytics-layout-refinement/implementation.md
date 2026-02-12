# Implementation Notes

## Analytics composition
- `src/components/AnalyticsPanel.tsx` (new):
  - Единая панель аналитики с верхними фильтрами:
    - выбор опросника (первый элемент),
    - период `с/по`,
    - быстрые кнопки `7 дней / 30 дней / все время`.
  - Фильтрация `results` по выбранному опроснику и диапазону дат.
  - Валидация некорректного диапазона (`from > to`) с отдельным сообщением.
  - Передача отфильтрованных данных в `ScoreChart` и `QuestionnaireStatsPanel`.

## Dashboard wiring
- `src/components/Dashboard.tsx`:
  - Ветка `activeTab === 'analytics'` переведена на новый компонент `AnalyticsPanel`.
  - Удалено локальное склеивание заголовка + отдельных старых блоков аналитики.

## Daily chart ergonomics
- `src/components/ScoreChart.tsx`:
  - Добавлена подсказка по клику на день календаря.
  - Пустые дни сделаны disabled/неинтерактивными.
  - Удален полноширинный дополнительный столбиковый блок под календарем.
  - Цветовая индикация сохранена внутри ячейки календаря.

## Question dynamics rule (`2+`)
- `src/components/QuestionnaireStatsPanel.tsx`:
  - Удален локальный селектор опросника (теперь приходит из верхнего фильтра).
  - Динамика отображается только для вопросов с `history.length > 1`.
  - Добавлены метрики: средний, последний, количество, изменение (`delta`).
  - Вопросы с недостатком данных вынесены в `details` блок.

## i18n + coverage
- `src/utils/i18n.ts`, `src/types/i18n.ts`:
  - Добавлены ключи для analytics-фильтров/валидации диапазона.
  - Добавлен `chart.timeline.hint`.
  - Добавлены ключи `questionStats.metric.delta`, `questionStats.lowData.*`.
- `src/utils/formTranslationCoverage.ts`:
  - Добавлены новые ключи в required lists dashboard/score-chart/question-stats.
