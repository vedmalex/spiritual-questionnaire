import { describe, expect, it } from 'vitest';
import type { Questionnaire } from '../types/questionnaire';
import {
  deriveServerSystemFolder,
  normalizeQuestionnaireIndexEntry,
  withServerFolderMetadata,
} from './questionnaireServerFolders';

const baseQuestionnaire: Questionnaire = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Spiritual Assessment Structure',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
  metadata: {
    title: { ru: 'Тест', en: 'Test' },
    source_lecture: { ru: 'Лекция', en: 'Lecture' },
    quality: 'quality',
    languages: ['ru', 'en'],
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [{ score: 0, meaning: 'none' }],
  },
  questions: [],
};

describe('questionnaireServerFolders', () => {
  it('normalizes nested questionnaire paths from index entries', () => {
    expect(normalizeQuestionnaireIndexEntry('  Урок№1\\sub\\quiz.json  ')).toBe(
      'Урок№1/sub/quiz.json'
    );
  });

  it('rejects invalid or unsafe index entries', () => {
    expect(() => normalizeQuestionnaireIndexEntry('')).toThrow(/Empty file name/);
    expect(() => normalizeQuestionnaireIndexEntry('../quiz.json')).toThrow(/Invalid questionnaire index entry/);
    expect(() => normalizeQuestionnaireIndexEntry('folder/quiz.txt')).toThrow(/Invalid questionnaire file extension/);
  });

  it('derives server folder path only for nested entries', () => {
    expect(deriveServerSystemFolder('quiz.json')).toBeNull();
    expect(deriveServerSystemFolder('lesson/module/quiz.json')).toBe('lesson/module');
  });

  it('merges server folder into questionnaire metadata with deduplication', () => {
    const withExisting: Questionnaire = {
      ...baseQuestionnaire,
      metadata: {
        ...baseQuestionnaire.metadata,
        system_folders: ['lesson/module', 'Custom'],
      },
    };

    const merged = withServerFolderMetadata(withExisting, 'lesson/module/quiz.json');
    expect(merged.metadata.system_folders).toEqual(['lesson/module', 'Custom']);
  });
});
