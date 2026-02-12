import type { Questionnaire, QuizResult, QuizSession, UserData } from '../types/questionnaire';

const USER_BACKUP_TYPE = 'spiritual-questionnaire-user-backup';
const USER_BACKUP_VERSION = '1.2.0';
const CURATOR_BACKUP_TYPE = 'spiritual-questionnaire-curator-backup';

export interface UserBackupPayload {
  type: typeof USER_BACKUP_TYPE;
  version: string;
  exportedAt: string;
  user: UserData;
  session: QuizSession | null;
  pausedSessions: QuizSession[];
  results: QuizResult[]; // student scope (legacy compatible field)
  curatorResults: QuizResult[];
  customQuestionnaires: Questionnaire[];
  appLanguage: string;
}

interface CreateUserBackupInput {
  user: UserData;
  session: QuizSession | null;
  pausedSessions: QuizSession[];
  studentResults: QuizResult[];
  curatorResults: QuizResult[];
  customQuestionnaires: Questionnaire[];
  appLanguage: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function createUserBackupPayload(input: CreateUserBackupInput): UserBackupPayload {
  return {
    type: USER_BACKUP_TYPE,
    version: USER_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: input.user,
    session: input.session,
    pausedSessions: input.pausedSessions,
    results: input.studentResults,
    curatorResults: input.curatorResults,
    customQuestionnaires: input.customQuestionnaires,
    appLanguage: input.appLanguage || 'ru',
  };
}

export function downloadUserBackupFile(payload: UserBackupPayload, filename?: string): void {
  const safeUserName = payload.user.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `user-backup-${safeUserName || 'user'}-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseUserBlock(rawUser: Record<string, unknown>): UserData {
  const role =
    rawUser.role === 'admin' || rawUser.role === 'curator' ? rawUser.role : 'student';

  const user: UserData = {
    name: String(rawUser.name || ''),
    role,
    createdAt: Number(rawUser.createdAt || Date.now()),
    theme: rawUser.theme === 'dark' ? 'dark' : 'light',
    language: String(rawUser.language || 'ru'),
  };

  if (!user.name.trim()) {
    throw new Error('В backup файле не указано имя пользователя.');
  }

  return user;
}

export function parseUserBackupPayload(content: string): UserBackupPayload {
  const parsed = JSON.parse(content) as unknown;

  if (!isObject(parsed)) {
    throw new Error('Некорректный формат backup файла.');
  }

  if (!isObject(parsed.user)) {
    throw new Error('В backup файле отсутствует блок пользователя.');
  }

  const user = parseUserBlock(parsed.user);

  if (parsed.type === CURATOR_BACKUP_TYPE) {
    return {
      type: USER_BACKUP_TYPE,
      version: String(parsed.version || USER_BACKUP_VERSION),
      exportedAt: String(parsed.exportedAt || new Date().toISOString()),
      user,
      session: null,
      pausedSessions: [],
      results: [],
      curatorResults: Array.isArray(parsed.curatorResults)
        ? (parsed.curatorResults as QuizResult[])
        : [],
      customQuestionnaires: [],
      appLanguage: String(parsed.appLanguage || user.language || 'ru'),
    };
  }

  if (parsed.type !== USER_BACKUP_TYPE) {
    throw new Error('Некорректный формат backup файла.');
  }

  const payload: UserBackupPayload = {
    type: USER_BACKUP_TYPE,
    version: String(parsed.version || USER_BACKUP_VERSION),
    exportedAt: String(parsed.exportedAt || new Date().toISOString()),
    user,
    session: isObject(parsed.session) ? (parsed.session as unknown as QuizSession) : null,
    pausedSessions: Array.isArray(parsed.pausedSessions)
      ? (parsed.pausedSessions as QuizSession[])
      : [],
    results: Array.isArray(parsed.results) ? (parsed.results as QuizResult[]) : [],
    curatorResults: Array.isArray(parsed.curatorResults)
      ? (parsed.curatorResults as QuizResult[])
      : [],
    customQuestionnaires: Array.isArray(parsed.customQuestionnaires)
      ? (parsed.customQuestionnaires as Questionnaire[])
      : [],
    appLanguage: String(parsed.appLanguage || user.language || 'ru'),
  };

  return payload;
}
