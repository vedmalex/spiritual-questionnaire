# Implementation

## Scope
- Расширена схема `Questionnaire.processing_rules`:
  - выражения DSL (`const`, `answer`, `metric`, арифметика, сравнения, `if`, `sum_answers`, `count_matches`);
  - `metrics`, `score`, `ranking`;
  - `honesty_checks` для валидности/честности ответов.
- Расширен контракт результата:
  - `QuizResult.computed_result` хранит вычисленные метрики, ranking, ошибки;
  - добавлен блок `honesty_checks` (`all_passed`, `failed_count`, детальные проверки).
- Нормализация/валидация схемы:
  - `normalizeQuestionnaire()` сохраняет только валидный `processing_rules`;
  - `validateQuestionnaire()` валидирует блок правил и возвращает ошибки контракта.

## Notes
- Проверки честности реализованы декларативно через DSL, без хардкода под конкретный тест.
