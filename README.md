# Spiritual Self-Assessment App

Приложение для самооценки духовных качеств на основе шастр Гаудия-вайшнавской традиции.

> **📋 STRUCTURED DOCUMENTATION AVAILABLE**
> - **Product Requirements:** `memory-bank/system/PRD.md`
> - **Architecture Details:** `memory-bank/system/ARCH.md`
> - **Verification Criterion:** `memory-bank/system/USER-REQ.md`
> - **Latest Audit:** `memory-bank/system/AUDIT-2026-02-11-user-req.md`

## 📚 Документация

Вся документация проекта находится в системе **Memory Bank**:

- **[USER-REQ.md](memory-bank/system/USER-REQ.md)** - эталон требований для сверки
- **[PRD.md](memory-bank/system/PRD.md)** - Product Requirements Document
- **[ARCH.md](memory-bank/system/ARCH.md)** - Architecture Overview
- **[ISSUES.md](memory-bank/system/ISSUES.md)** - Unified Issue Tracking
- **[current-context.md](memory-bank/system/current-context.md)** - текущий рабочий контекст

## Быстрый старт

```bash
npm install
npm run dev
npm run build
npm test
```

## Профильные сборки

Доступны три независимые сборки с разными профилями UI:

```bash
npm run build:student
npm run build:curator
npm run build:full
```

Или все сразу:

```bash
npm run build:profiles
```

Результат:

- `dist/student/client` и `dist/student/server`
- `dist/curator/client` и `dist/curator/server`
- `dist/full/client` и `dist/full/server`

## Деплой

После стандартной сборки (`npm run build`) используйте `dist/full/client/`.

Для профильных билдов используйте соответствующую папку `dist/<profile>/client/` для статического хостинга.

### Static Hosting Checklist

1. Соберите приложение: `npm run build`.
2. Публикуйте только клиентскую директорию:
   - `dist/full/client/` или `dist/<profile>/client/`.
3. Для deep-link роутов включите fallback на `index.html`.
4. Если хостинг не поддерживает кастомный rewrite, используйте `404.html` (генерируется автоматически).
5. Для PWA обязателен HTTPS (localhost для разработки поддерживается браузером).

### PWA Assets

В клиентский артефакт сборки входят:

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- `icons/qwiz-icon-192.png`
- `icons/qwiz-icon-512.png`
- `icons/qwiz-icon-maskable-192.png`
- `icons/qwiz-icon-maskable-512.png`
- `icons/apple-touch-icon.png`

### PWA Update Notifications

- В установленном PWA (standalone/fullscreen/minimal-ui) приложение периодически проверяет
  `questionnaires/index.json`.
- Если на сервере появились новые опросники, показывается системное notification-оповещение.
- Для уведомлений требуется разрешение браузера на Notifications API.

## Стек

- `TanStack Start`
- `React + TypeScript`
- `TailwindCSS`
- `localStorage` через adapter pattern

## Аналитика (GA)

Google Analytics подключается опционально через переменную окружения:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Если переменная не задана, трекинг не активируется.

## Лицензия

MIT
