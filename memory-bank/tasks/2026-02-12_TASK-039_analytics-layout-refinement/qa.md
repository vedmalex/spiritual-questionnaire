# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Playwright (WF-008)
- [x] Открыт dashboard analytics с seeded данными двух опросников.
- [x] Проверено наличие верхних фильтров (опросник первым, период `с/по`, быстрые диапазоны).
- [x] Проверен кликабельный календарь дня и наличие summary.
- [x] Подтверждено отсутствие legacy-полноширинного блока дневных столбиков.
- [x] Console error check: `Errors: 0`.

## Evidence
- `output/playwright/2026-02-12-task-035-analytics-layout/analytics-initial.png`
- `output/playwright/2026-02-12-task-035-analytics-layout/analytics-filtered-7d.png`
- `output/playwright/2026-02-12-task-035-analytics-layout/analytics-initial.yml`
- `output/playwright/2026-02-12-task-035-analytics-layout/analytics-filtered-7d.yml`
- `output/playwright/2026-02-12-task-035-analytics-layout/assert-analytics.json`
- `output/playwright/2026-02-12-task-035-analytics-layout/console-errors.log`
