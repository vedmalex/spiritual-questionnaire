# Plan

1. Выполнить preflight из `playwright` skill: проверить `npx`, настроить `PWCLI`.
2. На основе `TASK-025` выбрать критичные UI-флоу для smoke/regression покрытия.
3. Описать шаги Playwright CLI для каждого сценария (open/snapshot/click/fill/re-snapshot/assert-like checks).
4. Зафиксировать правила снятия артефактов в `output/playwright/` и минимальный набор evidence.
5. Подготовить QA-runbook запуска и критерии прохождения регресса.
