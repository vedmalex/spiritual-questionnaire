# Guides

- [Пользовательская инструкция (desktop/mobile, по профилям)](./user-manual.md)
- [Канонический baseline потоков для UI/QA](../testing/user-flow-baseline.md)

Назначение:
- `docs/guides/user-manual.md` — документация для конечных пользователей.
- `docs/testing/user-flow-baseline.md` — source of truth для `Flow ID`, regression checkpoints и приемки UI-изменений.

## Обновление пользовательских скриншотов

```bash
npm run docs:user-manual:screenshots
```

Скриншоты сохраняются в:
- `docs/guides/assets/user-manual/`
- `output/playwright/2026-02-12-task-059-user-manual/assert.json`
