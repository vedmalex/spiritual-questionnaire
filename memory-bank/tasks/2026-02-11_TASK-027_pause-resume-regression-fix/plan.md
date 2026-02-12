# Plan

1. Добавить `resumeSession()` в `useQuizSession` с переводом paused-сессии в active.
2. Обновить `handleResumePausedQuiz` в `src/routes/index.tsx` на использование `resumeSession`.
3. Устранить конфликт с paused URL cleanup effect во время resume-навигации.
4. Расширить `useQuizSession` unit test сценарием pause -> resume.
5. Выполнить `npm test`.
6. Подтвердить fix через Playwright smoke (resume flow) и приложить артефакты.
