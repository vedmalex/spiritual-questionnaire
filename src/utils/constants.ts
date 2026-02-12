// Data version for migrations
export const DATA_VERSION = 5;
export const APP_BUILD_ID =
  String(import.meta.env.VITE_APP_BUILD_ID || '').trim() || `dev-v${DATA_VERSION}`;

// Storage keys
export const STORAGE_KEYS = {
  APP_STATE: 'spiritual_questionnaire_state',
  USER: 'spiritual_questionnaire_user',
  SESSION: 'spiritual_questionnaire_session',
  PAUSED_SESSIONS: 'spiritual_questionnaire_paused_sessions',
  RESULTS: 'spiritual_questionnaire_results', // legacy key (pre-v4)
  RESULTS_STUDENT: 'spiritual_questionnaire_results_student',
  RESULTS_CURATOR: 'spiritual_questionnaire_results_curator',
  CUSTOM_QUESTIONNAIRES: 'spiritual_questionnaire_custom_questionnaires',
  STATIC_QUESTIONNAIRE_INDEX_SNAPSHOT: 'spiritual_questionnaire_static_questionnaire_index_snapshot',
  QUESTIONNAIRE_NOTIFICATION_PERMISSION_PROMPTED:
    'spiritual_questionnaire_notification_permission_prompted',
} as const;

// Grading system from SKILL.md
export const GRADING_DESCRIPTIONS = [
  { score: 0, meaning: 'не задумывался (отсутствие осознанности)' },
  { score: 1, meaning: 'когда вспоминаю, стараюсь, но уже поздно' },
  { score: 2, meaning: 'почти никогда не получается' },
  { score: 3, meaning: 'часто почти не получается' },
  { score: 4, meaning: 'получается редко, требует огромных усилий' },
  { score: 5, meaning: 'стараюсь, получается не всегда (50/50)' },
  { score: 6, meaning: 'получается чаще, чем не получается' },
  { score: 7, meaning: 'иногда получается стабильно (уверенная практика)' },
  { score: 8, meaning: 'получается в большинстве случаев' },
  { score: 9, meaning: 'почти всегда получается' },
  { score: 10, meaning: 'всегда (совершенство)' },
];
