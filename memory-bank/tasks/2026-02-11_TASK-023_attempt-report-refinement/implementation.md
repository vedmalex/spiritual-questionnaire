# Implementation Notes

## Updated files
- `src/utils/reportBuilder.ts`
  - Новый `buildResultReportBundle(...)` для single-attempt отчета.
  - Добавлены `formattedText` и `plainText`.
  - Убрано отображение `questionId`.
  - Пустые comment/photo секции не выводятся.
- `src/components/Dashboard.tsx`
  - Генерация отчета привязана к каждой отдельной попытке.
  - Добавлены кнопки:
    - «Скачать текст»
    - «Скачать текст без оформления»
- `src/utils/i18n.ts`, `src/types/i18n.ts`, `src/utils/formTranslationCoverage.ts`
  - Обновлены report labels и coverage-ключи.
- `src/utils/reportBuilder.test.ts`
  - Обновлены тесты под новый attempt-level формат.

## Result
- Отчетный UX соответствует пользовательскому сценарию “по одной оценке”.
