# Implementation Notes

## New shared components
- `src/components/ui/FormPrimitives.tsx`
  - `FormField`, `FormInput`, `FormSelect`, `FormTextarea`, `FormFileInput`.
- `src/components/ui/ProfileSelectors.tsx`
  - `RoleSelect`, `RoleSegmentedControl`, `RoleCards`.
  - `LanguageSelect`, `LanguageSegmentedControl`, `LanguageButtons`.

## Refactored integrations
- `src/components/Header.tsx`
  - role/language controls переведены на shared selectors.
- `src/components/UserSetup.tsx`
  - role cards + language buttons переведены на shared selectors.
- `src/components/QuestionnaireEditor.tsx`
  - формы переведены на `FormPrimitives`.
- `src/components/TranslationManager.tsx`
  - формы переведены на `FormPrimitives`.
- `src/components/AdminDashboard.tsx`
  - file input в reconciliation операции переведен на `FormPrimitives`.
