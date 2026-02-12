# Implementation

## Quiz score hint
- Файл: `src/components/QuizTaker.tsx`
- Изменения:
  - удален floating tooltip над кнопками оценки;
  - сохранено информативное поведение через единый текстовый hint под шкалой;
  - при hover/focus показывается режим предпросмотра (`preview`), иначе отображается выбранная оценка (`selected`);
  - добавлены `onFocus` / `onBlur` для одинакового поведения мыши и клавиатуры.

## i18n
- Файлы:
  - `src/utils/i18n.ts`
  - `src/types/i18n.ts`
- Изменения:
  - добавлен ключ `quiz.score.preview` для RU/EN.

