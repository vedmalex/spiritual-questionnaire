# Requirements Mapping (Task-029)

## UX / Product
1. Student cabinet should contain minimum distracting settings.
2. Defaults:
   - import strategy: replace duplicates;
   - export format: JSON.
3. Dynamics should be moved to separate analysis tab and usage should be trackable.
4. File selection descriptions should avoid technical jargon (JSON/ID) in student/curator contexts.
5. Questionnaire cards for students must not display internal questionnaire IDs.
6. Curator UI should also avoid excessive technical wording.
7. Add profile edit page where user can edit name; all settings should be grouped there.

## Admin / Schema
8. Questionnaire editor fields for context and self-check must support localization and be translated in RU.
9. Questionnaire schema must include language coverage metadata and require localized questionnaire content.
10. Update schema-related migration and update `spiritual-questionnaire-architect` skill contract.

## Process
11. UI changes must be covered by Playwright checks (WF-008 / playwright skill).
12. Keep memory-bank-core tracking files/task artifacts updated.
