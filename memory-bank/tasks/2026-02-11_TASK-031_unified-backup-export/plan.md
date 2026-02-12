# Plan

1. Найти участок logout, где выполняется отдельная curator выгрузка.
2. Перевести logout на единый backup payload/file.
3. Сохранить обратную совместимость импорта для старых curator-only backup файлов.
4. Обновить текст подсказок в profile (единый файл + автоопределение ролей/данных).
5. Выполнить QA: unit tests, build, Playwright logout-flow с проверкой одного файла и payload-содержимого.
