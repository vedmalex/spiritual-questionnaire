# Implementation

## Updated UI

### Header
- Файл: `src/components/Header.tsx`
- Изменения:
  - компактный профильный блок перенесен в верхнюю строку для экранов `<=640px`;
  - переключение на icon-brand происходит раньше (`<=480px`);
  - dropdown меню профиля поднято в более высокий слой (`z-[70]`);
  - устранены условия, при которых меню могло теряться за прокручиваемыми контейнерами.

### Dashboard (absent questions)
- Файл: `src/components/Dashboard.tsx`
- Изменения:
  - сообщение о отсутствующих вопросах сокращено до общей подсказки;
  - удален per-question бейдж `dashboard.group.absentBadge`;
  - отсутствующие вопросы теперь выделяются цветной рамкой (`amber`) по всей карточке вопроса.

### i18n text
- Файл: `src/utils/i18n.ts`
- Изменения:
  - `dashboard.group.absentQuestions` обновлен на краткую формулировку:
    - RU: «Вопросы, отсутствующие в текущей версии, помечены цветной рамкой.»
    - EN: «Questions missing in the current version are marked with a colored border.»

