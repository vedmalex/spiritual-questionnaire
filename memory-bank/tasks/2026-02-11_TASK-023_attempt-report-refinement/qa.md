# QA

## Automated checks
- `npm test` — ✅ pass (`6 files`, `11 tests`)
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Behavioral validation
- Отчет формируется на уровне отдельного результата.
- `questionId` не отображается в formatted/plain/html.
- Пустые comment/photo секции отсутствуют в отчете.
- Оба текста доступны для скачивания: formatted и plain.
