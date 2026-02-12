# Plan

1. Упростить student/curator dashboard UI: убрать техселектора формата/стратегии и закрепить defaults.
2. Добавить dashboard tab `analytics` и перенести туда блоки динамики (`ScoreChart` + `QuestionnaireStatsPanel`) с трекингом usage.
3. Добавить route `/profile` с редактированием имени и централизацией настроек (язык/тема/роль + загрузка опросников).
4. Расширить схему опросника до полного мультиязычного формата и обновить редактор под новые поля.
5. Обновить i18n словари/ключи и coverage requirements под новые формы.
6. Обновить `spiritual-questionnaire-architect` skill под новый JSON contract.
7. Выполнить QA: `npm test`, `npm run build`, Playwright smoke check UI-потока.
