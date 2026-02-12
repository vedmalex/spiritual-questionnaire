# Implementation Notes

## Updated files
- `src/utils/analytics.ts`
  - Добавлена безопасная инициализация GA.
  - Добавлен `trackPageView(...)`.
  - Подключение активно только при `VITE_GA_MEASUREMENT_ID`.
- `src/routes/__root.tsx`
  - Подключен `initializeAnalytics()` на mount.
  - Подключен route-driven `trackPageView(...)` через `useLocation`.
- `src/routes/index.tsx`, `src/components/Dashboard.tsx`
  - Добавлены `form_activity` события для ключевых действий:
    - старт/пауза/завершение опроса;
    - подготовка/скачивание/печать отчета.
- `README.md`
  - Добавлен раздел с env-настройкой GA.

## Runtime behavior
- Без env-переменной аналитика полностью выключена.
- С env-переменной отправляются page view и form activity события.
