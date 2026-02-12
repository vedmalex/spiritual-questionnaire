# Implementation Notes

## Dashboard Access Guard
- В `src/routes/dashboard.tsx` добавлен redirect-guard: если `user` отсутствует после загрузки, выполняется `navigate({ to: '/', replace: true })`.
- До завершения redirect рендерится loading-state, чтобы не показывать контент dashboard.

## Results Loading Gate
- В `src/hooks/useResults.ts` добавлен параметр `enabled`.
- При `enabled = false` hook не загружает данные результатов и возвращает пустой список.
- В `src/routes/dashboard.tsx` `useResults` вызывается как `useResults(resultsScope, ownerName, Boolean(user))`.

## Header Navigation Hardening
- В `src/components/Header.tsx` ссылка на `/dashboard` показывается только когда `user` существует.
- Это убирает путь к экрану результатов до выбора роли.

## Unit Test Update
- В `src/hooks/useResults.test.tsx` добавлен тест `does not load results when disabled`.
- Тест подтверждает, что при выключенном hook не вызывает adapter и не подгружает результаты.
