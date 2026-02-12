# Plan

1. Подключить `react-day-picker` и `date-fns` как основу для calendar range picker.
2. Реализовать UI-компонент `DateRangePicker` в стиле shadcn (button trigger + popover + calendar + clear/close actions).
3. Интегрировать новый компонент в `AnalyticsPanel` вместо двух полей `С даты/По дату`.
4. Обновить i18n/type coverage под новые ключи range picker.
5. Прогнать `npm test`, `npm run build` и Playwright сценарий range-selection.
