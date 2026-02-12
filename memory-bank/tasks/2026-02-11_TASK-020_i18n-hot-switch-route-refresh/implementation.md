# Implementation Notes

## Root cause
- При hot-switch языка route-контент не всегда перерисовывался в том же тике, хотя header обновлялся.
- В результате часть экрана могла оставаться на старом языке до перезагрузки страницы.

## Changes
- `src/routes/__root.tsx`
  - Добавлен `key={language}` для `<main ...>`:
    - при смене языка route-контент remount/re-render выполняется гарантированно;
    - i18n-строки в формах и dashboard применяются сразу после `RU/EN` переключения.

## Behavior check
- До фикса: `RU -> EN` оставлял `Личный кабинет` на dashboard до reload.
- После фикса: `Personal Dashboard` отображается сразу после клика по `EN`.
