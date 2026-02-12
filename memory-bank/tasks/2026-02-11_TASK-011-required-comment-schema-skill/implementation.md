# Implementation Notes

## Completed
- Типы/схема:
  - `src/types/questionnaire.ts`: `Question.requires_comment: boolean`.
  - `src/utils/questionnaireSchema.ts`: normalize + validate + template support для `requires_comment`.
  - `src/services/localStorageAdapter.ts`: static questionnaires now pass through `normalizeQuestionnaire`.
- Редактор опросников:
  - `src/components/QuestionnaireEditor.tsx`: checkbox per question "Требовать письменный комментарий".
- Runtime прохождения:
  - `src/components/QuizTaker.tsx`: если `requires_comment=true`, комментарий обязателен для `Next/Complete`.
  - Добавлены UX-подсказки о required-comment.
- i18n:
  - `src/types/i18n.ts`, `src/utils/i18n.ts`: новые ключи `quiz.comment.required`, `quiz.comment.requiredHint`.
  - `src/utils/formTranslationCoverage.ts`: добавлены эти ключи в coverage audit.
- Demo questionnaire:
  - `public/questionnaires/titiksha.json`: добавлены `requires_comment` поля.
- Skill sync:
  - `/Users/vedmalex/work/agent-skills/skills/spiritual-questionnaire-architect/SKILL.md`
  - schema updated (`question` localized support + `requires_comment`), added app compatibility requirements.

## Key References
- `src/types/questionnaire.ts`
- `src/utils/questionnaireSchema.ts`
- `src/components/QuestionnaireEditor.tsx`
- `src/components/QuizTaker.tsx`
- `src/services/localStorageAdapter.ts`
- `src/utils/i18n.ts`
- `/Users/vedmalex/work/agent-skills/skills/spiritual-questionnaire-architect/SKILL.md`
