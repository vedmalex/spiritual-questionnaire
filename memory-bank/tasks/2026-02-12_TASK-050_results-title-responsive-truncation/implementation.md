# Implementation

## Dashboard question title truncation
- Файл: `src/components/Dashboard.tsx`
- Изменения:
  - заголовок вопроса в collapsed-строке переведен в `block` + `truncate`;
  - добавлено адаптивное ограничение длины через `max-w` с `clamp(...)` и breakpoints:
    - меньше экран → меньше видимая часть;
    - больше экран → больше видимая часть.

## Requirement update
- Файл: `memory-bank/system/USER-REQ.md`
- Изменения:
  - добавлено UX-требование об адаптивном сокращении заголовков в просмотре результатов;
  - добавлен `UR-081` в матрицу критериев.
