# QA Checklist
- [x] Экспорт всех результатов создает валидный JSON payload для переноса.
- [x] Импорт принимает валидный JSON и отклоняет пустой/некорректный payload.
- [x] Повторный импорт использует дедупликацию по `result.id`.
- [x] Фото и feedback проходят через import/export контракт.
- [x] Полный ручной roundtrip сценарий на двух разных браузерах.

## Verification
- Build: ✅
- Typecheck: ✅
- Two-browser Playwright roundtrip: ✅ (`TASK-028`, artifacts in `output/playwright/2026-02-11-task-028-roundtrip`)
