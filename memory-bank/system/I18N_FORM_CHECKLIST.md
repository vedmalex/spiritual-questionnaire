# I18N Form Checklist

Use this checklist for every new or changed form.

## Design Phase
1. Identify all UI text nodes in the form (labels, placeholders, helper/error texts, button texts, statuses).
2. Define translation keys before implementation.
3. Add keys to `src/types/i18n.ts`.
4. Add `ru/en` translations to `src/utils/i18n.ts`.

## Implementation Phase
1. Use `t('...')` instead of hardcoded strings in form UI.
2. If form is new, add/update form requirements in `src/utils/formTranslationCoverage.ts`.
3. Ensure dynamic messages with params use placeholders (`{name}`, `{count}`, etc.).

## Verification Phase
1. Run `npm test` (includes coverage guard test).
2. Ensure `src/utils/formTranslationCoverage.test.ts` is green.
3. Optionally export coverage report in Translation Manager for manual audit.

## Definition Of Done
- Form has no missing keys for `ru/en`.
- Form is listed and fully covered in `formTranslationCoverage`.
- No hardcoded business UI text remains in changed sections.

Last Updated: 2026-02-11 18:42
