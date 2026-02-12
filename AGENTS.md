# AGENTS.md — spiritual-questionnaire

## Base System
Этот подпроект управляется через `memory-bank-core`.

Ключевые файлы:
- `memory-bank/system/USER-REQ.md` — эталон требований для сверки
- `memory-bank/system/PRD.md` — продуктовые требования
- `memory-bank/system/ARCH.md` — архитектура
- `memory-bank/system/ISSUES.md` — bugs/must-have backlog
- `memory-bank/system/current-context.md` — активный контекст
- `memory-bank/system/WORKFLOW.md` — обязательный workflow (admin+i18n+migration+reconciliation)

## Краткий процесс приложения
1. Пользователь вводит имя и выбирает роль.
2. Пользователь выбирает опросник.
3. Проходит вопросы по шкале 0..10, при необходимости добавляет комментарии и фото.
4. Состояние сохраняется локально, сессия восстанавливается после перезагрузки.
5. Студент смотрит историю/экспорт; куратор просматривает ответы и оставляет обратную связь.
6. На dashboard результаты отображаются по опроснику, с общей оценкой по каждому опроснику (словами и баллом).

## Runbook
```bash
npm install
npm run dev
npm run build
npm test
```

## Important
- Критерий сверки реализации: `memory-bank/system/USER-REQ.md`
- Последний аудит: `memory-bank/system/AUDIT-2026-02-11-user-req.md`
- Workflow требования: `memory-bank/system/WORKFLOW.md`
- Любое изменение UI должно подтверждаться Playwright-сценарием (skill `playwright`) с сохранением артефактов в задаче memory-bank.

Last Updated: 2026-02-11 14:12
