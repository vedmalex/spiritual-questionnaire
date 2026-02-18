import type {
  ArchivedUserRecord,
  CuratorResultFoldersState,
  Questionnaire,
  StudentQuestionnaireFoldersState,
  QuizSession,
  QuizResult,
  UserData,
} from '../types/questionnaire';
import type { DataAdapter, ResultsScope } from './dataAdapter';
import { STORAGE_KEYS } from '../utils/constants';
import { normalizeQuestionnaire } from '../utils/questionnaireSchema';
import {
  getQuestionnaireRuntimeId,
  stripLocalRuntimePrefix,
  withQuestionnaireRuntimeIdentity,
} from '../utils/questionnaireIdentity';
import { toPublicPath } from '../utils/publicPath';
import {
  normalizeQuestionnaireIndexEntry,
  withServerFolderMetadata,
} from '../utils/questionnaireServerFolders';

export class LocalStorageAdapter implements DataAdapter {
  private getResultsStorageKey(scope: ResultsScope = 'student'): string {
    return scope === 'curator' ? STORAGE_KEYS.RESULTS_CURATOR : STORAGE_KEYS.RESULTS_STUDENT;
  }

  private readAppState(): Record<string, unknown> {
    const data = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!data) return {};

    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn('Failed to parse app state, resetting state payload:', error);
    }

    return {};
  }

  private writeAppState(nextState: Record<string, unknown>): void {
    localStorage.setItem(STORAGE_KEYS.APP_STATE, JSON.stringify(nextState));
  }

  private readArchivedUsers(): ArchivedUserRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.USER_ARCHIVE);
    if (!data) {
      return [];
    }

    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed as ArchivedUserRecord[];
    } catch (error) {
      console.warn('Failed to parse user archive payload:', error);
      return [];
    }
  }

  private writeArchivedUsers(records: ArchivedUserRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.USER_ARCHIVE, JSON.stringify(records));
  }

  private async loadStaticQuestionnaires(): Promise<Questionnaire[]> {
    try {
      const response = await fetch(toPublicPath('questionnaires/index.json'));
      if (!response.ok) {
        throw new Error(`Failed to load index.json: HTTP ${response.status}`);
      }
      const files: string[] = await response.json();
      
      const questionnaires = await Promise.all(
        files.map(async (fileRaw) => {
          const file = normalizeQuestionnaireIndexEntry(fileRaw);
          const res = await fetch(toPublicPath(`questionnaires/${file}`));
          if (!res.ok) {
            throw new Error(`Failed to load "${file}": HTTP ${res.status}`);
          }
          const parsed = await res.json();
          return withServerFolderMetadata(normalizeQuestionnaire(parsed), file);
        })
      );
      
      return questionnaires;
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
      return [];
    }
  }

  async getCustomQuestionnaires(): Promise<Questionnaire[]> {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES);
    return data ? JSON.parse(data) : [];
  }

  async saveCustomQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    const { runtimeId: _runtimeId, source: _source, ...plainQuestionnaire } = questionnaire;
    const normalizedQuality = stripLocalRuntimePrefix(plainQuestionnaire.metadata.quality);
    const normalizedQuestionnaire: Questionnaire = {
      ...plainQuestionnaire,
      metadata: {
        ...plainQuestionnaire.metadata,
        quality: normalizedQuality,
      },
    };

    const current = await this.getCustomQuestionnaires();
    const filtered = current.filter(
      (item) => item.metadata.quality !== normalizedQuestionnaire.metadata.quality
    );
    filtered.push(normalizedQuestionnaire);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES, JSON.stringify(filtered));
  }

  async deleteCustomQuestionnaire(qualityId: string): Promise<void> {
    const normalizedQuality = stripLocalRuntimePrefix(qualityId);
    const current = await this.getCustomQuestionnaires();
    const filtered = current.filter((item) => item.metadata.quality !== normalizedQuality);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_QUESTIONNAIRES, JSON.stringify(filtered));
  }

  async getStudentQuestionnaireFolders(): Promise<StudentQuestionnaireFoldersState | null> {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENT_QUESTIONNAIRE_FOLDERS);
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as StudentQuestionnaireFoldersState;
      }
      return null;
    } catch (error) {
      console.warn('Failed to parse student questionnaire folders payload:', error);
      return null;
    }
  }

  async saveStudentQuestionnaireFolders(state: StudentQuestionnaireFoldersState): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.STUDENT_QUESTIONNAIRE_FOLDERS, JSON.stringify(state));
  }

  async getCuratorResultFolders(): Promise<CuratorResultFoldersState | null> {
    const data = localStorage.getItem(STORAGE_KEYS.CURATOR_RESULT_FOLDERS);
    if (!data) {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as CuratorResultFoldersState;
      }
      return null;
    } catch (error) {
      console.warn('Failed to parse curator result folders payload:', error);
      return null;
    }
  }

  async saveCuratorResultFolders(state: CuratorResultFoldersState): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.CURATOR_RESULT_FOLDERS, JSON.stringify(state));
  }

  async getUser(): Promise<UserData | null> {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  }

  async saveUser(user: UserData): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  async clearUser(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  async getArchivedUsers(): Promise<ArchivedUserRecord[]> {
    return this.readArchivedUsers().sort((a, b) => b.savedAt - a.savedAt);
  }

  async saveArchivedUser(record: ArchivedUserRecord): Promise<void> {
    const current = this.readArchivedUsers();
    const filtered = current.filter((item) => item.id !== record.id);
    filtered.push(record);
    this.writeArchivedUsers(filtered.sort((a, b) => b.savedAt - a.savedAt));
  }

  async getArchivedUserById(id: string): Promise<ArchivedUserRecord | null> {
    const current = this.readArchivedUsers();
    return current.find((item) => item.id === id) || null;
  }

  async deleteArchivedUser(id: string): Promise<void> {
    const current = this.readArchivedUsers();
    this.writeArchivedUsers(current.filter((item) => item.id !== id));
  }

  async getCurrentSession(): Promise<QuizSession | null> {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  }

  async saveSession(session: QuizSession): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  async getPausedSessions(): Promise<QuizSession[]> {
    const data = localStorage.getItem(STORAGE_KEYS.PAUSED_SESSIONS);
    if (!data) {
      return [];
    }

    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? (parsed as QuizSession[]) : [];
    } catch (error) {
      console.warn('Failed to parse paused sessions payload:', error);
      return [];
    }
  }

  async savePausedSessions(sessions: QuizSession[]): Promise<void> {
    localStorage.setItem(STORAGE_KEYS.PAUSED_SESSIONS, JSON.stringify(sessions));
  }

  async clearPausedSessions(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.PAUSED_SESSIONS);
  }

  async getResults(scope: ResultsScope = 'student'): Promise<QuizResult[]> {
    const scopedData = localStorage.getItem(this.getResultsStorageKey(scope));
    if (scopedData) {
      return JSON.parse(scopedData);
    }

    // Backward compatibility for pre-v4 payloads.
    if (scope === 'student') {
      const legacyData = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return legacyData ? JSON.parse(legacyData) : [];
    }

    return [];
  }

  async saveResults(results: QuizResult[], scope: ResultsScope = 'student'): Promise<void> {
    localStorage.setItem(this.getResultsStorageKey(scope), JSON.stringify(results));
  }

  async saveResult(result: QuizResult, scope: ResultsScope = 'student'): Promise<void> {
    const results = await this.getResults(scope);
    results.push(result);
    localStorage.setItem(this.getResultsStorageKey(scope), JSON.stringify(results));
  }

  async updateResult(result: QuizResult, scope: ResultsScope = 'student'): Promise<void> {
    const results = await this.getResults(scope);
    const exists = results.some((item) => item.id === result.id);
    const next = exists
      ? results.map((item) => (item.id === result.id ? result : item))
      : [...results, result];
    localStorage.setItem(this.getResultsStorageKey(scope), JSON.stringify(next));
  }

  async deleteResult(resultId: string, scope: ResultsScope = 'student'): Promise<void> {
    const results = await this.getResults(scope);
    const filtered = results.filter(r => r.id !== resultId);
    localStorage.setItem(this.getResultsStorageKey(scope), JSON.stringify(filtered));
  }

  async clearResults(scope: ResultsScope = 'student'): Promise<void> {
    localStorage.removeItem(this.getResultsStorageKey(scope));
  }

  async getQuestionnaires(): Promise<Questionnaire[]> {
    const [staticQuestionnaires, customQuestionnaires] = await Promise.all([
      this.loadStaticQuestionnaires(),
      this.getCustomQuestionnaires(),
    ]);

    const staticWithIdentity = staticQuestionnaires.map((questionnaire) =>
      withQuestionnaireRuntimeIdentity(questionnaire, 'static')
    );
    const customWithIdentity = customQuestionnaires.map((questionnaire) =>
      withQuestionnaireRuntimeIdentity(questionnaire, 'local')
    );

    return [...staticWithIdentity, ...customWithIdentity];
  }

  async getQuestionnaireById(id: string): Promise<Questionnaire | null> {
    const questionnaires = await this.getQuestionnaires();
    return (
      questionnaires.find((questionnaire) => getQuestionnaireRuntimeId(questionnaire) === id) ||
      questionnaires.find((questionnaire) => questionnaire.metadata.quality === id) ||
      null
    );
  }

  async getDataVersion(): Promise<number> {
    const state = this.readAppState();
    return typeof state.version === 'number' ? state.version : 0;
  }

  async setDataVersion(version: number): Promise<void> {
    const state = this.readAppState();
    state.version = version;
    this.writeAppState(state);
  }

  async getBuildId(): Promise<string | null> {
    const state = this.readAppState();
    if (typeof state.buildId === 'string' && state.buildId.trim()) {
      return state.buildId;
    }
    return null;
  }

  async setBuildId(buildId: string): Promise<void> {
    const state = this.readAppState();
    state.buildId = buildId;
    this.writeAppState(state);
  }
}

export const dataAdapter = new LocalStorageAdapter();
