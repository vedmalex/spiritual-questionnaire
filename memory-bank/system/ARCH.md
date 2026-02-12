# ARCH — Architecture Overview

> **📚 SOURCE DOCUMENTATION**
> - `memory-bank/system/USER-REQ.md`
> - `memory-bank/system/PRD.md`

## Stack
- `TanStack Start`
- `React + TypeScript`
- `TailwindCSS`
- `localStorage` via `DataAdapter`

## Core Architecture
- UI Components: onboarding, quiz, dashboards, editor, loader, translation tool.
- Hooks Layer: user/session/results/questionnaires/theme.
- Services Layer: adapter + migrations.
- Utilities: i18n, export, questionnaire schema normalization/validation.

## Key Decisions
- Adapter pattern retained for future server migration.
- Custom questionnaires persisted in local registry (`localStorage`) and merged with static files.
- Exact grading scale (0..10 meanings) enforced in normalization pipeline.
- Curator feedback and review statuses persisted in result model.

## Main Modules
- `src/components/QuestionnaireEditor.tsx`
- `src/components/QuestionnaireLoader.tsx`
- `src/components/TranslationManager.tsx`
- `src/services/localStorageAdapter.ts`
- `src/utils/questionnaireSchema.ts`

## Remaining Architectural Risk
- Mobile-friendliness подтверждена по responsive классам, но не подтверждена device-аудитом.

**Last Updated:** 2026-02-11
