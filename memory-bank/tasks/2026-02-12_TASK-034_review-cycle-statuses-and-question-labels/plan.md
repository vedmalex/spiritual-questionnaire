# Plan

1. Расширить `ReviewStatus` и добавить backward-compatible mapping `approved -> needs_revision`.
2. Обновить CuratorDashboard: новые статусы/кнопки и отображение текста вопроса рядом с номером.
3. Обновить Student Dashboard: отображение текста вопроса рядом с номером в списке результатов.
4. Обновить i18n и coverage-guard для новых translation keys.
5. Добавить тест на migration-совместимость статуса и подтвердить UI-поведение Playwright-сценарием.
