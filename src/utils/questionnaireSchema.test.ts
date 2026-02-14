import { describe, expect, it } from 'vitest';
import { normalizeQuestionnaire, validateQuestionnaire } from './questionnaireSchema';

describe('questionnaireSchema', () => {
  it('normalizes missing requires_comment to false', () => {
    const normalized = normalizeQuestionnaire({
      metadata: {
        title: { ru: 'Sample', en: 'Sample' },
        source_lecture: { ru: 'Lecture', en: 'Lecture' },
        quality: 'sample-quality',
        languages: ['ru', 'en'],
      },
      questions: [
        {
          id: 'q1',
          question: { ru: 'Вопрос' },
          context_sources: ['src'],
          self_check_prompts: ['prompt'],
        },
      ],
    });

    expect(normalized.questions).toHaveLength(1);
    expect(normalized.questions[0].requires_comment).toBe(false);
    expect(normalized.metadata.languages).toEqual(['ru', 'en']);
    expect(typeof normalized.questions[0].context_sources).toBe('object');
    expect(Array.isArray((normalized.questions[0].context_sources as Record<string, string[]>).ru)).toBe(true);
  });

  it('reports invalid requires_comment type', () => {
    const validation = validateQuestionnaire({
      metadata: {
        title: { ru: 'Sample', en: 'Sample' },
        source_lecture: { ru: 'Lecture', en: 'Lecture' },
        quality: 'sample-quality',
        languages: ['ru', 'en'],
      },
      questions: [
        {
          id: 'q1',
          question: { ru: 'Question', en: 'Question' },
          context_sources: { ru: [], en: [] },
          self_check_prompts: { ru: [], en: [] },
          requires_comment: 'yes',
        },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('requires_comment'))).toBe(true);
  });

  it('requires multilingual question fields when metadata.languages is provided', () => {
    const validation = validateQuestionnaire({
      metadata: {
        title: { ru: 'Sample', en: 'Sample' },
        source_lecture: { ru: 'Lecture', en: 'Lecture' },
        quality: 'sample-quality',
        languages: ['ru', 'en'],
      },
      questions: [
        {
          id: 'q1',
          question: { ru: 'Только русский' },
          context_sources: { ru: ['источник'] },
          self_check_prompts: { ru: ['подсказка'] },
          requires_comment: false,
        },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('question.en'))).toBe(true);
  });

  it('keeps valid system_folders metadata and rejects invalid values', () => {
    const normalized = normalizeQuestionnaire({
      metadata: {
        title: { ru: 'Sample', en: 'Sample' },
        source_lecture: { ru: 'Lecture', en: 'Lecture' },
        quality: 'sample-quality',
        languages: ['ru', 'en'],
        system_folders: ['Server/Main', ' Server/Secondary '],
      },
      questions: [
        {
          id: 'q1',
          question: { ru: 'Question', en: 'Question' },
          context_sources: { ru: ['src'], en: ['src'] },
          self_check_prompts: { ru: ['prompt'], en: ['prompt'] },
          requires_comment: false,
        },
      ],
    });

    expect(normalized.metadata.system_folders).toEqual(['Server/Main', 'Server/Secondary']);

    const invalid = validateQuestionnaire({
      metadata: {
        title: { ru: 'Sample', en: 'Sample' },
        source_lecture: { ru: 'Lecture', en: 'Lecture' },
        quality: 'sample-quality',
        languages: ['ru', 'en'],
        system_folders: ['ok', ''],
      },
      questions: [
        {
          id: 'q1',
          question: { ru: 'Question', en: 'Question' },
          context_sources: { ru: [], en: [] },
          self_check_prompts: { ru: [], en: [] },
          requires_comment: false,
        },
      ],
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors.some((error) => error.includes('system_folders'))).toBe(true);
  });
});
