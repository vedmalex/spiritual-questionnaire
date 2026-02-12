# TASK-026 — Playwright UI Tests

## Goal
Подготовить и реализовать набор UI-тестов ключевых пользовательских сценариев через `playwright` skill (CLI-first подход), чтобы закрыть smoke/regression риски по основным потокам приложения.

## Linked Requirements
- `UR-003`, `UR-004`, `UR-005`
- `UR-011`, `UR-012`, `UR-013`
- `UR-023`, `UR-053`, `UR-054`, `UR-055`
- `UR-044`, `UR-058`, `UR-059`
- `UR-027`

## Deliverables
- Матрица UI-сценариев для автопроверки (student/core, curator, admin-critical).
- Набор воспроизводимых Playwright CLI-проходов с использованием wrapper-скрипта (`$PWCLI`).
- Артефакты прогонов в `output/playwright/` (screenshot/trace по ключевым сценариям).
- QA-отчет с результатами smoke/regression и найденными дефектами.

## Status
- Implementation: ✅ Completed
- QA: ✅ Completed (smoke run completed via Playwright CLI, 1 regression finding logged)
