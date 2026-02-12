# QA Checklist
- [x] При нажатии на logout скачивается backup JSON с пользовательскими данными.
- [x] После logout пользовательские данные очищаются из local storage.
- [x] На экране входа доступен импорт backup файла.
- [x] После импорта backup пользователь восстанавливается в приложении.

## Verification
- Typecheck: ✅ (`npx tsc --noEmit`)
- Build: ✅ (`npm run build`)
