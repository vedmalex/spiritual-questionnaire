# QA

## Verification
- `npx tsc --noEmit` — ✅ pass
- `npm run build` — ✅ pass

## Notes
- SSR build успешен, ошибок типизации нет.
- В output есть предупреждения от TanStack/Vite о неиспользуемых imports во внешних пакетах (не блокируют билд).
