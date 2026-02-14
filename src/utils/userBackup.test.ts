import { describe, expect, it } from 'vitest';
import type { QuizResult, UserData } from '../types/questionnaire';
import { createUserBackupPayload, parseUserBackupPayload } from './userBackup';
import { createDefaultStudentQuestionnaireFoldersState } from './studentQuestionnaireFolders';
import { createDefaultCuratorResultFoldersState } from './curatorResultFolders';

const sampleUser: UserData = {
  name: 'Test User',
  role: 'curator',
  createdAt: 1739577600000,
  theme: 'light',
  language: 'ru',
};

const sampleCuratorResult: QuizResult = {
  id: 'curator-result-1',
  questionnaireId: 'titiksha',
  questionnaireTitle: 'Терпение',
  userName: 'Student A',
  userRole: 'student',
  completedAt: 1739577600000,
  answers: {
    q1: {
      score: 7,
      comment: 'comment',
      curatorFeedback: [],
    },
  },
  totalScore: 7,
  maxPossibleScore: 10,
  percentage: 70,
  reviewStatus: 'pending',
  absentInCurrentSchemaQuestionIds: [],
};

describe('user backup payload', () => {
  it('stores student and curator data in a single payload', () => {
    const payload = createUserBackupPayload({
      user: sampleUser,
      session: null,
      pausedSessions: [],
      studentResults: [],
      curatorResults: [sampleCuratorResult],
      customQuestionnaires: [],
      studentQuestionnaireFolders: createDefaultStudentQuestionnaireFoldersState(),
      curatorResultFolders: createDefaultCuratorResultFoldersState(),
      appLanguage: 'ru',
    });

    const parsed = parseUserBackupPayload(JSON.stringify(payload));
    expect(parsed.type).toBe('spiritual-questionnaire-user-backup');
    expect(parsed.results).toEqual([]);
    expect(parsed.pausedSessions).toEqual([]);
    expect(parsed.curatorResults).toHaveLength(1);
    expect(parsed.curatorResults[0].id).toBe(sampleCuratorResult.id);
    expect(parsed.studentQuestionnaireFolders.folders).toEqual([]);
    expect(parsed.curatorResultFolders.folders).toEqual([]);
  });

  it('keeps compatibility with legacy curator-only backup files', () => {
    const legacyPayload = {
      type: 'spiritual-questionnaire-curator-backup',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: sampleUser,
      curatorResults: [sampleCuratorResult],
      appLanguage: 'ru',
    };

    const parsed = parseUserBackupPayload(JSON.stringify(legacyPayload));
    expect(parsed.type).toBe('spiritual-questionnaire-user-backup');
    expect(parsed.results).toEqual([]);
    expect(parsed.pausedSessions).toEqual([]);
    expect(parsed.curatorResults).toHaveLength(1);
    expect(parsed.user.role).toBe('curator');
    expect(parsed.studentQuestionnaireFolders.folders).toEqual([]);
    expect(parsed.curatorResultFolders.folders).toEqual([]);
  });
});
