# Implementation

## Scope
- Реализован безопасный интерпретатор `processing_rules` без `eval`/произвольного JS:
  - whitelist-only DSL операций;
  - рекурсивный parser/validator;
  - evaluator с контролем глубины и количества узлов.
- Добавлены runtime-ограничения:
  - `MAX_RULE_DEPTH`;
  - `MAX_RULE_NODES`;
  - защита от циклических зависимостей метрик;
  - безопасная обработка деления на ноль.
- Добавлен слой `honesty_checks` в runtime:
  - вычисление `pass_expression` и `value_expression`;
  - возврат агрегата (`allPassed`, `failedCount`) и детализации по каждой проверке.
- Интеграция с completion flow:
  - rules-driven override итогового score (если задан);
  - сохранение `computed_result` с метриками/ranking/honesty/errors.
- Интеграция с transfer/import:
  - `computed_result` (включая `honesty_checks`) сохраняется при roundtrip.

## Notes
- Подход остается lightweight и пригоден для PWA/mobile за счет собственного DSL-интерпретатора.
