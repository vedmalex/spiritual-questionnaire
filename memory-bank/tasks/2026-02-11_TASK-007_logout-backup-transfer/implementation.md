# Implementation Notes

## Completed
- Добавлен backup utility:
  - `src/utils/userBackup.ts`
  - формирование payload,
  - скачивание backup файла,
  - парсинг и базовая валидация backup при восстановлении.
- Расширен user flow:
  - `useUser.exportAndLogout()` — экспорт + очистка user/session/results,
  - `useUser.restoreFromBackup()` — восстановление user/session/results/custom questionnaires.
- В header добавлена кнопка `Выйти` с запуском export+logout.
- На экране входа добавлен импорт backup файла для быстрого восстановления.
- В data adapter добавлены методы `clearUser` и `clearResults`.

## Key References
- `src/utils/userBackup.ts`
- `src/hooks/useUser.ts`
- `src/components/Header.tsx`
- `src/components/UserSetup.tsx`
- `src/routes/index.tsx`
- `src/services/dataAdapter.ts`
- `src/services/localStorageAdapter.ts`
