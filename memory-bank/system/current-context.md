🤖 Memory Bank 3.0
🔍 SCANNING: Checking for bugs, must-haves, and reusable patterns...
📋 LOADING: Essential project context files for informed decision-making...

---

## Session Context
- Date: 2026-02-12
- Active Planning Focus: FUTURE milestone planning (rules engine, media expansion, recurring flows, folder routing)

## New Requirement Block
- Added `UR-035`..`UR-052` in `USER-REQ`.
- Added workflow baseline: `memory-bank/system/WORKFLOW.md`.
- Added `UR-043`: результаты на dashboard группируются по опроснику с общей оценкой словами и баллом.
- Added FUTURE block from `/Users/vedmalex/work/ai-questionary/FUTURE.md` into `USER-REQ`: `UR-083..UR-092`.
- Planned synchronization of skill `spiritual-questionnaire-architect` with FUTURE features (`TASK-058`).
- Added user documentation block in `USER-REQ`: `UR-093..UR-096` (desktop/mobile manuals by profile + regular playwright-cli refresh).
- Added workflow rule `WF-009` for mandatory user-manual maintenance.
- Added canonical flow-maintenance requirements in `USER-REQ`: `UR-097..UR-098` (Flow ID + regression checkpoints + QA linkage).
- Added requirement `UR-099`: executable `playwright-cli` scenario pack for canonical Flow ID regression.
- Added folder-routing block from `/Users/vedmalex/work/ai-questionary/FUTURE.md` into `USER-REQ`: `UR-100..UR-106`.
- Added requirement `UR-107`: honesty/validity checks in processing rules with persisted result flags.

## Created Task
1. `2026-02-11_TASK-005_admin-i18n-workflow-hardening`
2. `2026-02-11_TASK-006_dashboard-questionnaire-overall-score`
3. `2026-02-11_TASK-007_logout-backup-transfer`
4. `2026-02-11_TASK-008_build-aware-migration-calendar`
5. `2026-02-11_TASK-009_curator-grouped-review-transfer`
6. `2026-02-11_TASK-010_i18n-coverage-audit`
7. `2026-02-11_TASK-011-required-comment-schema-skill`
8. `2026-02-11_TASK-012_i18n-missing-keys-closure`
9. `2026-02-11_TASK-013_baseline-smoke-tests`
10. `2026-02-11_TASK-014_i18n-policy-enforcement`
11. `2026-02-11_TASK-015_final-user-req-audit-045-056`
12. `2026-02-11_TASK-016_mobile-audit-hardening`
13. `2026-02-11_TASK-017_lever-form-and-selectors-reuse`
14. `2026-02-11_TASK-018_questionnaire-readable-report`
15. `2026-02-11_TASK-019_i18n-reactive-rerender-fix`
16. `2026-02-11_TASK-020_i18n-hot-switch-route-refresh`
17. `2026-02-11_TASK-021_question-level-dynamics-refinement`
18. `2026-02-11_TASK-022_student-curator-storage-isolation`
19. `2026-02-11_TASK-023_attempt-report-refinement`
20. `2026-02-11_TASK-024_ga-analytics-integration`
21. `2026-02-11_TASK-025_ui-structure-blueprint`
22. `2026-02-11_TASK-026_playwright-ui-tests`
23. `2026-02-11_TASK-027_pause-resume-regression-fix`
24. `2026-02-11_TASK-028_roundtrip-two-browser-validation`
25. `2026-02-11_TASK-029_student-profile-ui-simplification`
26. `2026-02-11_TASK-030_pre-role-results-gating`
27. `2026-02-11_TASK-031_unified-backup-export`
28. `2026-02-12_TASK-032_questionnaire-index-autogen`
29. `2026-02-12_TASK-033_local-questionnaire-runtime-split`
30. `2026-02-12_TASK-034_review-cycle-statuses-and-question-labels`
31. `2026-02-12_TASK-035_pwa-static-hosting-readiness`
32. `2026-02-12_TASK-036_qwiz-icon-bright-refresh`
33. `2026-02-12_TASK-037_pwa-questionnaire-update-notifications`
34. `2026-02-12_TASK-038_icon-transparent-corners`
35. `2026-02-12_TASK-039_analytics-layout-refinement`
36. `2026-02-12_TASK-040_shadcn-range-picker-analytics`
37. `2026-02-12_TASK-041_multi-paused-quiz-sessions`
38. `2026-02-12_TASK-042_markdown-editor-safe-render-user-archive`
39. `2026-02-12_TASK-043_report-print-pdf-header-mobile-consistency`
40. `2026-02-12_TASK-044_header-compact-profile-dropdown-navigation`
41. `2026-02-12_TASK-045_report-print-theme-isolation`
42. `2026-02-12_TASK-046_remove-profile-surge-deploy-scripts`
43. `2026-02-12_TASK-052_questionnaire-rules-engine-schema`
44. `2026-02-12_TASK-053_safe-rules-runtime-sandbox`
45. `2026-02-12_TASK-054_questionnaire-intro-outro-and-images`
46. `2026-02-12_TASK-055_recurring-questionnaire-reminders`
47. `2026-02-12_TASK-056_audio-video-answer-attachments`
48. `2026-02-12_TASK-057_rich-media-transfer-formats`
49. `2026-02-12_TASK-058_spiritual-questionnaire-architect-future-sync`
50. `2026-02-12_TASK-059_user-manual-playwright-cli-maintenance`
51. `2026-02-12_TASK-060_playwright-cli-flow-scenario-pack`
52. `2026-02-12_TASK-061_global-playwright-flow-scenario-skill`
53. `2026-02-12_TASK-062_playwright-flow-coverage-gap-closure`
54. `2026-02-12_TASK-063_user-docs-and-canonical-flow-baseline-relocation`
55. `2026-02-12_TASK-064_student-folder-hierarchy-and-reorder`
56. `2026-02-12_TASK-065_curator-folder-routing-and-counters`
57. `2026-02-12_TASK-066_import-folder-assignment-flow`

## Current State
- Запущено планирование новой FUTURE-вехи: требования `UR-083..UR-092` добавлены в `USER-REQ`, созданы задачи `TASK-052..TASK-058`.
- Выполнены `TASK-052` и `TASK-053`: добавлен декларативный rules-engine в схему опросника и безопасный DSL-runtime (без `eval`) с лимитами глубины/узлов и защитой от циклов.
- В rules-engine добавлен блок `honesty_checks` для механизмов проверки честности (валидность ответов) с сохранением результатов в `computed_result` и поддержкой import/export.
- Для skill `spiritual-questionnaire-architect` запланировано отдельное обновление под новую схему/фичи (`TASK-058`).
- Добавлен и заполнен baseline пользовательских потоков `docs/testing/user-flow-baseline.md` (desktop/mobile + student/curator/admin) со скриншотами, сгенерированными через `playwright-cli`.
- Введен регулярный процесс обновления инструкции: `npm run docs:user-manual:screenshots` (`WF-009`, open maintenance item `MH-013`).
- Выполнен follow-up `TASK-059`: инструкция обновлена до канонического flow-baseline формата (стабильные Flow ID, expected result и regression checkpoints для student/curator/admin на desktop/mobile).
- Выполнен `TASK-060`: добавлен отдельный `playwright-cli` scenario pack (JSON matrix + runner + launcher), который проходит ключевые Flow ID и формирует `assert.json`/`report.md` + screenshots для UI/UX regression; повторный прогон `npm run test:ui:flow-scenarios` подтверждён (`19/19`, `0 failed`).
- Выполнен `TASK-061`: создан глобальный skill `playwright-flow-scenario-builder` для генерации `scenario-pack.json` из требований/flow-list и автоматического сбора UI-артефактов (`screenshots`, `assert.json`, `report.md`) через `playwright-cli`.
- Выполнен `TASK-062`: закрыты gaps покрытия `Flow ID` в сценарном пакете (`STU-02/03/08/10/13`, `CUR-02/05`), coverage выровнен до полного (`22/22`), полный прогон `npm run test:ui:flow-scenarios` подтверждён (`31/31`, `0 failed`).
- Выполнен `TASK-063`: канонический Flow ID baseline перенесен в `docs/testing/user-flow-baseline.md`, а `docs/guides/user-manual.md` переоформлен как пользовательская инструкция на основе сценариев и snapshot-артефактов; ссылки в workflow/docs обновлены под новое разделение.
- Запущена синхронизация FUTURE-блока по папкам: требования `UR-100..UR-106` выделены, сформирован набор задач `TASK-064..TASK-066` (student hierarchy, curator routing/counters, import assignment flow).
- Выполнен `TASK-064`: добавлена student folder hierarchy для списка опросников (вложенные папки + свободное перемещение и reorder папок/опросников), добавлена миграция `v6` и backup/archive совместимость для folder state; проверки `npm test`, `npm run build`, `npm run test:ui:flow-scenarios -- --flow-ids \"STU-04\"` подтверждены (`2/2`, `0 failed`). Дополнительно выполнен full-pack `npm run test:ui:flow-scenarios` (`25/31`, `6 failed`) с non-scope падениями старых flow-action сценариев (`STU-05`, `STU-09`, `STU-10`, `STU-12`, `CUR-03`).
- Dashboard-требование `UR-043` реализовано и зафиксировано отдельной задачей.
- `UR-036` реализован: добавлена роль `admin` и единый admin-hub.
- `UR-040` реализован: миграционные маркеры удаленных вопросов + UI отображение.
- `UR-041` реализован: pre-load reconciliation встроен в import pipeline.
- `UR-044` реализован: logout с авто-выгрузкой backup + восстановление при входе.
- `UR-037` реализован: translation panel подгружает текущие переводы выбранного языка.
- `UR-039` реализован: dynamic language fields в редакторе опросников.
- `UR-042` реализован: графики без low/medium/high категорий, только шкала USER-REQ.
- `UR-047`, `UR-048` реализованы: build-aware migration trigger + build key persistence.
- `UR-049` реализован: fingerprint-дедупликация при merge импортируемых результатов.
- `UR-050`, `UR-051` реализованы: динамика во времени + календарная навигация в графиках.
- `UR-053`, `UR-054`, `UR-055` реализованы: grouped curator workflow + import student answers + export reviewed transfer.
- `UR-038` реализован: добавлен coverage audit переводов форм + export report.
- `UR-035` усилен для новой формы: CuratorDashboard переведен на translation keys.
- `UR-056` реализован: добавлен `requires_comment` в схему вопроса, редактор и runtime-проверку прохождения.
- Skill `spiritual-questionnaire-architect` синхронизирован с приложением (multilingual question + `requires_comment` + app compatibility rules).
- Follow-up по `UR-038` закрыт: missing keys для admin/editor/loader/chart/dashboard устранены, coverage audit = `11/11` форм.
- Закрыт `MH-002` и `BUG-001`: добавлены baseline smoke tests, `npm test` проходит (`6 files`, `11 tests`).
- Закрыт `MH-003`: i18n-first policy закреплена в workflow + checklist + automated coverage guard test.
- Финальная user-req сверка блока `UR-045..UR-057` выполнена и зафиксирована в audit.
- Закрыт `MH-001` / `UR-027`: выполнен mobile audit 320/375/768, добавлены responsive hardening изменения в Header/Dashboard/Curator.
- Закрыты `LEV-001` и `LEV-002`: добавлены shared form primitives и shared role/language selectors.
- `UR-057` реализован: dashboard формирует readable-отчет по выбранному опроснику с markdown export и print шаблоном.
- Исправлена reactive i18n-перерисовка: язык применяется ко всем компонентам без ручной перезагрузки формы.
- Follow-up фикс по i18n hot-switch: route content теперь обновляется сразу после смены языка (без reload) за счет language-keyed content boundary в root shell.
- Уточнение `UR-034`/`UR-050` реализовано: динамика самооценки показывается на уровне конкретного вопроса выбранного опросника и отображается только при наличии 2+ оценок по вопросу.
- Реализована изоляция данных student/curator: раздельные storage scopes, separate curator import/review store, и отдельный curator backup export на logout при наличии данных.
- Отчеты переработаны под попытку (single attempt): скрыт `questionId`, пустые comment/photo блоки не выводятся, добавлены экспорты «Скачать текст» и «Скачать текст без оформления».
- Добавлена опциональная GA-интеграция (env: `VITE_GA_MEASUREMENT_ID`) с трекингом page view и ключевых form-activity событий.
- Формализация UI-структуры по `USER-REQ` и `WORKFLOW` зафиксирована в `TASK-025` (route map, role screens, navigation/state matrix, UR traceability).
- Блок UI smoke/regression тестов через `playwright` skill выполнен в `TASK-026` (scenario matrix + runbook + artifacts).
- Regression `BUG-002` (paused-session resume) исправлен в `TASK-027` и подтвержден повторным Playwright smoke-run.
- Закрыт QA follow-up по `TASK-003`: двухбраузерный roundtrip `export -> import -> verify` подтвержден в `TASK-028`.
- Выполнен `TASK-029`: student UI упрощен (минимум отвлекающих настроек), настройки вынесены в `/profile`, defaults закреплены (`JSON + replace`), динамика перенесена в отдельную вкладку аналитики с usage tracking.
- Выполнен `TASK-030`: просмотр результатов заблокирован до выбора роли (guard `/dashboard` + скрытие ссылки dashboard без user), подтверждено Playwright-сценарием.
- Выполнен `TASK-031`: logout выгружает единый backup файл (student + curator внутри), добавлена совместимость импорта legacy curator-only backup.
- Выполнен `TASK-032`: `public/questionnaires/index.json` теперь генерируется автоматически на build и обновляется в dev при add/unlink/change JSON-файлов.
- Выполнен `TASK-033`: локальные опросники больше не перекрывают встроенные при совпадении `quality`; отображаются обе версии, локальная помечена `(локальный)`, ответы изолированы через runtime-id.
- Выполнен `TASK-034`: уточнен review-цикл (статусы `Проверено` и `На доработку`, legacy `approved` маппится в `needs_revision`), а в экранах куратора/студента рядом с номером показывается текст вопроса на текущей локали.
- Выполнен `TASK-035`: добавлена PWA-база (`manifest + service worker + offline fallback + brand icons QWIZ`) и static-hosting readiness (`index.html` + auto `404.html` fallback после build).
- Выполнен `TASK-036`: обновлен icon-pack в более ярком стиле (лист/лиана + график/календарь + зеленая галочка), подтверждено Playwright-артефактами.
- Выполнен `TASK-037`: для установленного PWA добавлены уведомления о новых опросниках на сервере (polling `questionnaires/index.json` + system notification через SW/Notification API).
- Выполнен `TASK-038`: белые углы на иконке устранены: верхние «уголки» карточки больше не белые, внешние углы PNG подтверждены прозрачными (`alpha=0`) и зафиксированы в Playwright QA.
- Выполнен `TASK-039`: переработан analytics layout (первым идет выбор опросника, добавлен фильтр периода, убран полноширинный дубль-график под календарем, динамика вопросов показывается только для 2+ оценок).
- Выполнен `TASK-040`: date period filter в аналитике переведен на shadcn-style range picker (Calendar + Popover на `react-day-picker`) с подтверждением сценария выбора диапазона через Playwright.
- Выполнен `TASK-041`: pause/resume расширен до нескольких paused-опросников; при выборе карточки опросника студент продолжает именно соответствующую paused-сессию с сохраненного вопроса.
- Выполнен `TASK-042`: формы student/dashboard/curator переведены на headless TipTap markdown editor (с inline image), отдельный photo-input в ответах удален; отображение markdown вынесено в safe renderer с защитой от исполнимого JS/XSS.
- Выполнен `TASK-042`: logout усилен confirm + предупреждением о сохранении backup-файла; добавлен локальный архив пользователей (adapter API + восстановление на входе) и smoke-проверка сценария через `playwright` skill.
- Выполнен follow-up `TASK-042`: toolbar markdown-редактора переведен на иконки (без технических текстовых сокращений), подтверждено Playwright UI-проверкой.
- Выполнен follow-up `TASK-042`: browser `confirm/alert` для logout заменены на in-app modal flow в стиле приложения, предупреждение дополнено пояснением про «файл профиля» для восстановления на другом устройстве.
- Выполнен follow-up `TASK-023/042`: preview отчета перенесен inline в карточку выбранной попытки (в секцию результатов), добавлены клиентские экспорты HTML и PDF (через print-dialog), подтверждено Playwright UI-проверкой.
- Выполнен follow-up UI simplification: в отчете оставлены 2 ключевых действия (одна кнопка «Скачать» с dropdown-форматами + одна «Печать»), а кнопка выхода перенесена из Header в Profile с пояснением сценария logout/re-login.
- Выполнен `TASK-043`: печать отчета переведена на iframe-based print flow (без popup-block проблем), добавлен прямой клиентский экспорт PDF, в Header удалены mobile combo-box (`select`) и включен единый segmented UI с horizontal scroll; переход в профиль доступен по клику на имя, переход на главную — по клику на название приложения.
- Выполнен `TASK-044`: в Header переходы `Результаты/Профиль` перенесены в dropdown под блоком пользователя, верхняя навигация сокращена для student/curator (compact mode), и подтверждены route-переходы через Playwright smoke.
- Выполнен `TASK-045`: подготовка отчета к печати/PDF отвязана от dark/light темы приложения: report export принудительно использует светлую color scheme и явный контрастный цвет текста, что устраняет бледный/нечитаемый PDF в dark mode.
- Выполнен `TASK-046`: удалены npm-скрипты профильной публикации на `surge.sh`; deployment-инструкции сведены к full build (`dist/full/client`).
- Зафиксирован follow-up bug `BUG-003`: в static prerender runtime наблюдается `React #418` hydration mismatch (консольная ошибка), требуется отдельная стабилизация.
- Обновлена схема опросников до полного мультиязычного контракта (`metadata.languages`, локализованные `question/context_sources/self_check_prompts`) и добавлена migration `v5`.
- Обновлен skill `spiritual-questionnaire-architect` под новый schema contract.

## Loaded Critical Files
- `memory-bank/system/USER-REQ.md`
- `memory-bank/system/PRD.md`
- `memory-bank/system/ISSUES.md`
- `memory-bank/system/WORKFLOW.md`
- `memory-bank/system/AUDIT-2026-02-11-user-req.md`

Last Updated: 2026-02-14 22:45
