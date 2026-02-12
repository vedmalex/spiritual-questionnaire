# Implementation Notes

## Completed
- Собрано актуальное описание UI на базе текущей реализации (роуты, role-branching, состояния, ключевые блоки экранов).
- Зафиксирована карта экранов по ролям `student`, `curator`, `admin`.
- Зафиксирована матрица переходов состояний (setup, quiz, pause/resume, dashboard focus, review, admin ops).
- Добавлена трассировка требований `UR-*` к экранным зонам и компонентам.
- Выделен список критичных UI-флоу как вход для `TASK-026` (Playwright smoke/regression).

## Main Deliverable
- `memory-bank/tasks/2026-02-11_TASK-025_ui-structure-blueprint/artifacts/specs/ui-structure.md`

## Key References
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/editor.tsx`
- `src/routes/translations.tsx`
- `src/components/Header.tsx`
- `src/components/UserSetup.tsx`
- `src/components/QuestionnaireList.tsx`
- `src/components/QuizTaker.tsx`
- `src/components/Dashboard.tsx`
- `src/components/CuratorDashboard.tsx`
- `src/components/AdminDashboard.tsx`
- `src/components/QuestionnaireEditor.tsx`
- `src/components/TranslationManager.tsx`
- `src/components/ScoreChart.tsx`
- `src/components/QuestionnaireStatsPanel.tsx`
