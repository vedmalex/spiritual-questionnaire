import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Questionnaire } from '../types/questionnaire';
import { LocalStorageAdapter } from './localStorageAdapter';

const staticQuestionnaire: Questionnaire = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Spiritual Assessment Structure',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
  metadata: {
    title: { ru: 'Статический Титикша', en: 'Static Titiksha' },
    source_lecture: { ru: 'Лекция', en: 'Lecture' },
    quality: 'titiksha',
    languages: ['ru', 'en'],
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [{ score: 0, meaning: 'none' }],
  },
  questions: [
    {
      id: 'q1',
      question: { ru: 'Вопрос', en: 'Question' },
      context_sources: { ru: ['Источник'], en: ['Source'] },
      self_check_prompts: { ru: ['Подсказка'], en: ['Prompt'] },
      requires_comment: false,
      user_score: null,
    },
  ],
};

const localQuestionnaire: Questionnaire = {
  ...staticQuestionnaire,
  metadata: {
    ...staticQuestionnaire.metadata,
    title: { ru: 'Локальный Титикша', en: 'Local Titiksha' },
  },
};

describe('LocalStorageAdapter questionnaire identity', () => {
  const adapter = new LocalStorageAdapter();

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'spiritual_questionnaire_custom_questionnaires',
      JSON.stringify([localQuestionnaire])
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/questionnaires/index.json')) {
          return {
            json: async () => ['titiksha.json'],
          } as Response;
        }

        if (url.endsWith('/questionnaires/titiksha.json')) {
          return {
            json: async () => staticQuestionnaire,
          } as Response;
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('returns static and local questionnaires with distinct runtime ids', async () => {
    const questionnaires = await adapter.getQuestionnaires();

    expect(questionnaires).toHaveLength(2);
    expect(questionnaires.map((item) => item.runtimeId)).toEqual([
      'titiksha',
      'local:titiksha',
    ]);
    expect(questionnaires.map((item) => item.source)).toEqual(['static', 'local']);
  });

  it('resolves local questionnaire by runtime id without colliding with static', async () => {
    const staticResolved = await adapter.getQuestionnaireById('titiksha');
    const localResolved = await adapter.getQuestionnaireById('local:titiksha');

    expect(staticResolved?.source).toBe('static');
    expect(localResolved?.source).toBe('local');
    expect(localResolved?.metadata.title).toEqual({ ru: 'Локальный Титикша', en: 'Local Titiksha' });
  });
});
