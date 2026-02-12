import { describe, expect, it } from 'vitest';
import type { Questionnaire } from '../types/questionnaire';
import {
  getQuestionnaireRuntimeId,
  isLocalQuestionnaire,
  stripLocalRuntimePrefix,
  toLocalQuestionnaireRuntimeId,
  withQuestionnaireRuntimeIdentity,
} from './questionnaireIdentity';

const baseQuestionnaire: Questionnaire = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Spiritual Assessment Structure',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
  metadata: {
    title: 'Demo',
    source_lecture: 'Lecture',
    quality: 'demo-quality',
    languages: ['ru', 'en'],
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [{ score: 0, meaning: 'none' }],
  },
  questions: [],
};

describe('questionnaire identity', () => {
  it('builds stable local runtime ids', () => {
    expect(toLocalQuestionnaireRuntimeId('demo-quality')).toBe('local:demo-quality');
    expect(stripLocalRuntimePrefix('local:demo-quality')).toBe('demo-quality');
    expect(stripLocalRuntimePrefix('demo-quality')).toBe('demo-quality');
  });

  it('annotates questionnaires with source/runtime identity', () => {
    const staticQuestionnaire = withQuestionnaireRuntimeIdentity(baseQuestionnaire, 'static');
    const localQuestionnaire = withQuestionnaireRuntimeIdentity(baseQuestionnaire, 'local');

    expect(getQuestionnaireRuntimeId(staticQuestionnaire)).toBe('demo-quality');
    expect(isLocalQuestionnaire(staticQuestionnaire)).toBe(false);

    expect(getQuestionnaireRuntimeId(localQuestionnaire)).toBe('local:demo-quality');
    expect(isLocalQuestionnaire(localQuestionnaire)).toBe(true);
  });
});
