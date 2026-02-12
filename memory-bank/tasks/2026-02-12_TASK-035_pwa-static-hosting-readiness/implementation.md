# Implementation Notes

## Initial Findings
- До изменений клиентский build не содержал `index.html` в `dist/*/client`, что делало static-only деплой неочевидным.
- `manifest.json` был шаблонный (`TanStack App`) и без брендовой идентики.
- Регистрация service worker отсутствовала.

## Static Hosting Readiness
- `vite.config.ts`:
  - включен `tanstackStart({ spa: { enabled: true, prerender: { outputPath: '/index.html' } } })`.
- `package.json` + `scripts/postbuild-static-fallback.mjs`:
  - после каждой профильной сборки автоматически создается `dist/<profile>/client/404.html` как копия `index.html`.

## PWA Runtime
- `src/routes/__root.tsx`:
  - добавлены `manifest`, `icon`, `apple-touch-icon` links и meta для theme/mobile-web-app.
  - добавлен вызов регистрации service worker.
- `src/utils/pwa.ts`:
  - реализована регистрация service worker с учетом `import.meta.env.BASE_URL`.
- `public/sw.js`:
  - shell/runtime caching, offline fallback для навигации.
- `public/offline.html`:
  - offline-страница для UX при отсутствии сети.
- `public/manifest.webmanifest` и `public/manifest.json`:
  - обновлены под PWA `QWIZ` и новый икон-пак.

## Brand Icon (`QWIZ`)
- Добавлен исходник: `public/icons/qwiz-icon-source.svg`.
- Сгенерированы:
  - `public/icons/qwiz-icon-192.png`
  - `public/icons/qwiz-icon-512.png`
  - `public/icons/qwiz-icon-maskable-192.png`
  - `public/icons/qwiz-icon-maskable-512.png`
  - `public/icons/apple-touch-icon.png`
  - обновлены `public/favicon.ico`, `public/logo192.png`, `public/logo512.png`.

## Documentation
- `README.md` обновлен секциями:
  - static hosting checklist,
  - PWA assets list,
  - пояснение по `index.html/404.html` fallback.

## Follow-up Bug
- Обнаружен hydration error в static prerender runtime (`React #418`), зафиксирован как `BUG-003` в `memory-bank/system/ISSUES.md`.
