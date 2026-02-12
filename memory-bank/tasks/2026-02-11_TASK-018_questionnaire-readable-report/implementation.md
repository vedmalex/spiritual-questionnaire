# Implementation Notes

## Report generation
- Добавлен `src/utils/reportBuilder.ts`:
  - `buildQuestionnaireReportBundle(...)` генерирует:
    - Markdown-версию отчета (включая data URL фото в markdown image syntax).
    - Полноценный print-friendly HTML документ для readable view/печати.
  - `downloadMarkdownReport(...)`.
  - `printReportHtml(...)`.

## Dashboard integration
- Обновлен `src/components/Dashboard.tsx`:
  - кнопка подготовки отчета для каждого grouped questionnaire.
  - панель отчета с iframe-preview.
  - действия: скачать Markdown, печать, закрыть отчет.

## i18n and coverage
- Добавлены ключи `dashboard.report.*` в:
  - `src/types/i18n.ts`
  - `src/utils/i18n.ts` (RU/EN)
- Обновлен coverage checklist:
  - `src/utils/formTranslationCoverage.ts` (student-dashboard keys)

## Tests
- Добавлен `src/utils/reportBuilder.test.ts`:
  - проверка генерации markdown/html с фото.
  - проверка fallback при отсутствии вопроса в текущей схеме.
