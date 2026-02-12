# Implementation Notes

## Dependencies
- Added:
  - `react-day-picker`
  - `date-fns`

## New UI component
- `src/components/ui/DateRangePicker.tsx`:
  - Trigger button with current range label / placeholder.
  - Popover with `DayPicker` in `mode="range"`.
  - Locale switch (`ru` / `en`) via `date-fns/locale`.
  - Actions:
    - `Очистить` (reset range)
    - `Закрыть` (close popover)
  - Outside-click close handling.

## Analytics integration
- `src/components/AnalyticsPanel.tsx`:
  - Replaced two native date inputs with unified `DateRangePicker`.
  - Preset buttons (`7/30/all`) now write into `DateRange`.
  - Range bounds normalized to day start/day end timestamps.
  - Filter pipeline remains:
    - questionnaire id match
    - range start/end boundaries
  - Preserved quick period controls and existing analytics rendering flow.

## i18n/type coverage
- `src/types/i18n.ts`:
  - Added keys:
    - `dashboard.analytics.filter.quickPeriod`
    - `dashboard.analytics.filter.rangePlaceholder`
    - `dashboard.analytics.filter.clear`
- `src/utils/i18n.ts`:
  - Added RU/EN translations for the new keys.
- `src/utils/formTranslationCoverage.ts`:
  - Added new keys to dashboard coverage required list.
