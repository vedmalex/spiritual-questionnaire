# Playwright CLI Flow Scenarios

Канонический сценарный пакет для `playwright-cli`, связанный с `Flow ID` из `docs/testing/user-flow-baseline.md`.

## Назначение

1. Автоматический обход ключевых пользовательских потоков (`student`, `curator`, `admin`).
2. Регрессионные UI/UX скриншоты по desktop/mobile.
3. Единый артефакт проверки для задач, которые меняют UI.

## Источник сценариев

- Модульный scenario-pack: `docs/testing/scenarios/index.mjs`
- Каждая запись содержит:
  - `id`
  - `flowIds`
  - `profile`
  - `path`
  - `viewport`
  - `requiredText`
  - `screenshot`
  - опционально `action`

## Покрытие flow (v2.0.0)

- Student: `STU-01..STU-13`
- Curator: `CUR-01..CUR-05`
- Admin: `ADM-01..ADM-04`

Итого: полное покрытие всех `Flow ID` из `docs/testing/user-flow-baseline.md`.

## Запуск

```bash
# Все 31 сценарий
npm run test:ui:flow-scenarios

# Фильтрация по flow ID
bash scripts/run-playwright-flow-scenarios.sh --flow-ids "STU-05,CUR-03"

# Фильтрация по scenario ID
bash scripts/run-playwright-flow-scenarios.sh --scenario-ids "PW-FLOW-STU-05-QUIZ-DESKTOP"
```

По умолчанию используются:
- `PW_BASE_URL=http://localhost:3000`
- wrapper `$PWCLI`
- output: `output/playwright/flow-scenarios/`
- screenshots: `docs/guides/assets/user-manual/`

## Артефакты

- Скриншоты: `docs/guides/assets/user-manual/*.png`
- JSON-отчет: `output/playwright/flow-scenarios/assert.json`
- Markdown-отчет: `output/playwright/flow-scenarios/report.md`

## Политика обновления

1. Если меняется flow в `docs/testing/user-flow-baseline.md`, обновить `flowIds`/шаги сценария.
2. Если меняется UI-текст, обновить `requiredText`.
3. В `memory-bank/tasks/.../qa.md` указывать затронутые `Flow ID` и ссылку на `assert.json`.
