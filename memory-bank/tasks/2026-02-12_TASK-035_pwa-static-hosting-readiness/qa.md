# QA

## Automated Checks
- [x] `npm test`
- [x] `npm run build`

## Build/Static Validation
- [x] В `dist/full/client` присутствуют `index.html`, `404.html`, `manifest.webmanifest`, `sw.js`, `offline.html`.
- [x] Direct open deep-link `/dashboard` через static server возвращает HTTP `200` (fallback работает).

## Playwright (WF-008)
- [x] Проверка загрузки приложения после статической сборки (`serve -s dist/full/client`).
- [x] Проверка наличия `manifest` и `apple-touch-icon` в `<head>`.
- [x] Проверка service worker: `hasServiceWorkerApi=true`, `registrationCount=1`, `hasController=true`.
- [x] Проверка deep-link (`/dashboard`) на static server.

## Known Issue
- [!] В static prerender runtime фиксируется console error: `Minified React error #418` (hydration mismatch).
- [!] Issue зарегистрирован как `BUG-003` для отдельного follow-up.

## Playwright Run Details
- Tool: `playwright` skill wrapper (`$PWCLI`)
- Static server: `npx serve -s dist/full/client -l 4173`
- Session: `task035pwa`

## Evidence
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/home.png`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/home.md`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/assert-head.json`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/assert-sw.json`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/assert-deeplink.json`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/deeplink.png`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/deeplink.md`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/network-initial.log`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/network-deeplink.log`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/console-errors-initial.log`
- `output/playwright/2026-02-12-task-035-pwa-static-hosting/console-errors-deeplink.log`
