# Implementation Notes

## Scope
- Только иконка/ассеты, без изменений runtime-логики.

## Implementation Log
- Обновлен master SVG `public/icons/qwiz-icon-source.svg`:
  - белая карточка переведена с rounded-`rect` на `path` c началом от `y=320`,
  - верхние белые уголки карточки убраны (в этой зоне теперь фон и синяя шапка, без белых выступов).
- Обнаружено, что ранее сгенерированные PNG имели белую заливку в внешних углах иконки.
- Полный icon-pack перегенерирован через `rsvg-convert` (с сохранением альфа-канала/прозрачности):
  - `public/icons/qwiz-icon-192.png`
  - `public/icons/qwiz-icon-512.png`
  - `public/icons/qwiz-icon-maskable-192.png`
  - `public/icons/qwiz-icon-maskable-512.png`
  - `public/icons/apple-touch-icon.png`
- Синхронизированы app-логотипы:
  - `public/logo192.png`
  - `public/logo512.png`
- Пересобран `favicon` на базе нового `512`:
  - `public/favicon.ico`
