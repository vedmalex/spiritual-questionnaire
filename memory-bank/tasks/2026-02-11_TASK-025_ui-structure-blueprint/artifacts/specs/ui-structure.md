# UI Structure Blueprint (Task-025)

## Source Snapshot
- Date: 2026-02-11
- Product routes analyzed:
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
  - `src/routes/dashboard.tsx`
  - `src/routes/editor.tsx`
  - `src/routes/translations.tsx`
- Core UI components analyzed:
  - `src/components/Header.tsx`
  - `src/components/UserSetup.tsx`
  - `src/components/QuestionnaireList.tsx`
  - `src/components/QuizTaker.tsx`
  - `src/components/Dashboard.tsx`
  - `src/components/ScoreChart.tsx`
  - `src/components/QuestionnaireStatsPanel.tsx`
  - `src/components/CuratorDashboard.tsx`
  - `src/components/AdminDashboard.tsx`
  - `src/components/QuestionnaireEditor.tsx`
  - `src/components/TranslationManager.tsx`
  - `src/components/QuestionnaireLoader.tsx`

## 1. Global UI Shell
- `RootDocument` renders persistent shell: `Header` + `<main key={language}>`.
- Header includes:
  - app title link (`/`);
  - role switcher (when profile has 2+ enabled roles);
  - language switcher;
  - light/dark theme toggle;
  - logout button (with backup export).
- Route content is language-keyed (`key={language}`), so route-level UI rerenders immediately on language switch.
- Analytics is initialized once in root and tracks page view by route.

## 2. Product Route Map

| Route | Primary purpose | Access behavior |
| --- | --- | --- |
| `/` | Main entry: setup, student flow, or role-routed dashboard | All roles; internal branch by user role and active session |
| `/dashboard` | Student results dashboard or role-specific dashboard entry | Student sees `Dashboard`, curator sees `CuratorDashboard`, admin sees `AdminDashboard` |
| `/editor` | Questionnaire editor tool | Admin-only; others get access denied block |
| `/translations` | Translation manager tool | Admin-only; others get access denied block |

Notes:
- `/demo/*` routes exist but are non-product TanStack examples.
- Active quiz URL state uses query params on `/`: `quiz`, `q`, `returnUrl`.
- Dashboard URL state uses query params on `/dashboard`: `tab`, `adminTab`, `focusResultId`, `focusResultAt`, `focusQuestionId`.

## 3. Role-Based Screen Structure

### 3.1 Anonymous/First Entry
- Screen: `UserSetup`
- Blocks:
  - language selector (RU/EN);
  - role cards (student/curator/admin, profile-aware);
  - name input with validation;
  - optional backup-file login import.

### 3.2 Student
- Home (`/`, list mode):
  - title/subtitle;
  - paused-session resume banner;
  - `QuestionnaireList` grid;
  - `QuestionnaireLoader` (template download + local upload).
- Quiz (`/` with active `quiz` + `q`):
  - progress bar;
  - localized question text;
  - context sources;
  - self-check prompt accordion;
  - score selector 0..10 with tooltip description;
  - comment area with `requires_comment` enforcement;
  - photo attachments add/remove;
  - navigation controls: prev, pause, next/complete.
- Dashboard (`/dashboard`, student view):
  - top actions: export all, import all (skip/replace strategy), export format selector;
  - tabs: results / feedback;
  - results tab: grouped attempts by questionnaire with overall score (label + x/10), details per attempt/question, absent-question markers, edit/open action, report generation, per-attempt export/delete;
  - report panel: preview iframe + download text + download plain text + print;
  - analytics blocks: score distribution, timeline calendar, selected questionnaire question-level metrics and dynamics;
  - feedback tab: thread view per result/question with comment editing and student reply.

### 3.3 Curator
- Screen: `CuratorDashboard` (from `/` or `/dashboard` when role is curator).
- Blocks:
  - ops row: import student answers, export reviewed, strategy/format selectors;
  - metrics row: totals/group/pending/reviewed/average;
  - grouped review sections: active groups and completed groups;
  - result review card:
    - status badge;
    - question-level score/comment/photo view;
    - add curator feedback per question;
    - mark reviewed/approved;
    - export reviewed group for student transfer.

### 3.4 Admin
- Screen: `AdminDashboard` hub (`/` or `/dashboard` when role is admin).
- Tabs:
  - `overview`: quick action cards to open questionnaires/translations/operations;
  - `questionnaires`: embeds `QuestionnaireEditor`;
  - `translations`: embeds `TranslationManager`;
  - `operations`: migrations + pre-load reconciliation report.
- Dedicated admin routes:
  - `/editor` -> `QuestionnaireEditor`;
  - `/translations` -> `TranslationManager`;
  - both routes explicitly deny access for non-admin.

## 4. Navigation and State Transition Map

| From state | User action | To state | URL/state transition |
| --- | --- | --- | --- |
| No user | Submit setup form | Role home | Save user + render role branch in `/` |
| No user | Import backup file | Restored profile | User/session/results restored + render role branch |
| Student list | Select questionnaire | Active quiz | `/` with `quiz`, `q`, `returnUrl` |
| Active quiz | Next/prev | Active quiz | `/` query `q` changes, session index sync |
| Active quiz | Pause | Student list or dashboard return URL | Session status `paused`, navigate by `returnUrl` |
| Paused session | Continue | Active quiz | `/` with saved `quiz` + `q` |
| Active quiz | Complete | Dashboard focus | Save result, clear session, navigate `/dashboard` with focus params |
| Dashboard result | Open questionnaire for edit | Active quiz from historical result | Creates session with `sourceResultId`, returns to `/` with return URL to focused dashboard item |
| Any authenticated role | Switch role in header | Role-specific UI | Persist role, rerender route content branch |
| Any authenticated role | Logout | Entry setup | Export backup(s), clear local stores, navigate `/` |

## 5. UI Contract Rules (Current)
- i18n:
  - UI keys centralized via `t(...)`;
  - coverage checklist for 11 forms (`formTranslationCoverage`).
- Theme:
  - binary theme switch (`light`/`dark`) in header;
  - persisted in `localStorage`.
- Mobile:
  - responsive classes applied across setup, header, student, curator, admin screens;
  - controls wrap/full-width on smaller breakpoints.
- Role isolation:
  - student and curator datasets are loaded from separated scopes;
  - curator role UI does not render student personal dashboard history.
- Admin gate:
  - editor/translation/ops are concentrated in admin hub and admin routes.

## 6. UR-to-UI Traceability (Task-025 Scope)

| Requirement | UI coverage |
| --- | --- |
| `UR-002`, `UR-003` | `UserSetup` name + role selection |
| `UR-004` | Header role switch controls (`RoleSelect` / `RoleSegmentedControl`) |
| `UR-005` | `QuestionnaireList` selection cards |
| `UR-013` | `Dashboard` grouped history and result details |
| `UR-043` | Dashboard questionnaire grouping + overall score (label + 10-point value) |
| `UR-057` | Dashboard report generation panel (preview, text, plain text, print) |
| `UR-023` | `CuratorDashboard` student answer review UI |
| `UR-053` | `CuratorDashboard` grouping by questionnaire + student |
| `UR-020` | Language switchers + translated text across routes/components |
| `UR-035` | Forms implemented with translation keys and coverage guard |
| `UR-037` | `TranslationManager` load/edit/add translation flow |
| `UR-038` | Translation coverage audit section/table + report export |
| `UR-026` | Educational/professional dashboard and form layout style |
| `UR-027` | Responsive behavior across major screens/components |
| `UR-028` | Theme switch in global header (`light`/`dark`) |
| `UR-036` | Admin profile with unified tabs: questionnaires/translations/operations |

## 7. Input for Task-026 (Playwright)
- Critical UI flows to automate next:
  1. Anonymous setup -> student -> questionnaire start -> pause/resume -> complete.
  2. Student dashboard results tab + report build + plain text export button visibility.
  3. Student dashboard feedback tab open + reply save flow.
  4. Curator grouped review: import -> open result -> add feedback -> mark reviewed -> export group.
  5. Admin tabs and operations: overview -> questionnaires -> translations -> operations (migration/reconciliation controls visible).
  6. Header controls: language switch immediate rerender + theme toggle + role switch + logout.
