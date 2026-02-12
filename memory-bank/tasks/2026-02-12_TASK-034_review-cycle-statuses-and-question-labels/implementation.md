# Implementation Notes

## Review status model
- `src/types/questionnaire.ts`:
  - Добавлен статус `needs_revision`.
  - `approved` сохранен как legacy alias для обратной совместимости старых payload.
- `src/utils/resultsTransfer.ts`:
  - Нормализация импорта: `approved` автоматически маппится в `needs_revision`.

## Curator UI
- `src/components/CuratorDashboard.tsx`:
  - Добавлен `useQuestionnaires()` + lookup схемы вопросов по `questionnaireId`.
  - В карточках ответов показывается `Вопрос {n}:` + локализованный текст вопроса.
  - Кнопка смены статуса обновлена: `Отправить на доработку` (`needs_revision`) вместо `Одобрить`.
  - Badge-стили/labels обновлены для нового статуса.

## Student UI
- `src/components/Dashboard.tsx`:
  - В списке ответов в истории попытки показывается `#n` и текст вопроса текущей локали.
  - При раскрытии деталей ответа добавлен отдельный блок `Вопрос: ...` с полным текстом (без обрезки `truncate`), чтобы студент видел формулировку целиком.

## i18n
- `src/utils/i18n.ts`, `src/types/i18n.ts`:
  - Добавлены ключи `curator.status.needsRevision`, `curator.actions.requestRevision`.
  - `curator.status.approved` и `curator.actions.approve` оставлены как legacy-совместимые алиасы.
- `src/utils/formTranslationCoverage.ts`:
  - Coverage-guard переключен на новые ключи.

## Tests
- `src/utils/resultsTransfer.test.ts`:
  - Добавлен тест маппинга legacy `approved -> needs_revision`.
