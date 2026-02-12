# Plan

1. Ввести `results scope` (`student`/`curator`) в adapter contract.
2. Перевести `useResults` и `CuratorDashboard` на scoped data access.
3. Ограничить student-dashboard owner-фильтром.
4. Обновить backup flow: отдельный curator backup export на logout.
5. Добавить миграцию разделения legacy results store.
6. Прогнать тесты и сборку.
