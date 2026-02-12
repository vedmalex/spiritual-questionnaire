import type { Questionnaire, QuizSession, QuizResult, UserData } from '../types/questionnaire';

export type ResultsScope = 'student' | 'curator';

export interface DataAdapter {
  // User operations
  getUser(): Promise<UserData | null>;
  saveUser(user: UserData): Promise<void>;
  clearUser(): Promise<void>;
  
  // Session operations
  getCurrentSession(): Promise<QuizSession | null>;
  saveSession(session: QuizSession): Promise<void>;
  clearSession(): Promise<void>;
  getPausedSessions(): Promise<QuizSession[]>;
  savePausedSessions(sessions: QuizSession[]): Promise<void>;
  clearPausedSessions(): Promise<void>;
  
  // Results operations
  getResults(scope?: ResultsScope): Promise<QuizResult[]>;
  saveResults(results: QuizResult[], scope?: ResultsScope): Promise<void>;
  saveResult(result: QuizResult, scope?: ResultsScope): Promise<void>;
  updateResult(result: QuizResult, scope?: ResultsScope): Promise<void>;
  deleteResult(resultId: string, scope?: ResultsScope): Promise<void>;
  clearResults(scope?: ResultsScope): Promise<void>;
  
  // Questionnaire operations
  getQuestionnaires(): Promise<Questionnaire[]>;
  getQuestionnaireById(id: string): Promise<Questionnaire | null>;
  saveCustomQuestionnaire(questionnaire: Questionnaire): Promise<void>;
  getCustomQuestionnaires(): Promise<Questionnaire[]>;
  deleteCustomQuestionnaire(qualityId: string): Promise<void>;
  
  // Migration
  getDataVersion(): Promise<number>;
  setDataVersion(version: number): Promise<void>;
  getBuildId(): Promise<string | null>;
  setBuildId(buildId: string): Promise<void>;
}
