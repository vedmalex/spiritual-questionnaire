import { describe, expect, it } from 'vitest';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { buildResultReportBundle } from './reportBuilder';

const questionnaire: Questionnaire = {
  metadata: {
    title: 'Тестовый опросник',
    source_lecture: 'Лекция',
    quality: 'test_quality',
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [],
  },
  questions: [
    {
      id: 'question_1',
      question: {
        ru: 'Сохраняю ли я спокойствие?',
        en: 'Do I keep calm?',
      },
      context_sources: [],
      self_check_prompts: [],
      requires_comment: true,
      user_score: null,
    },
  ],
  title: 'Test',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
};

const resultWithCommentAndPhoto: QuizResult = {
  id: 'result_1',
  questionnaireId: 'test_quality',
  questionnaireTitle: 'Тестовый опросник',
  userName: 'Student',
  userRole: 'student',
  completedAt: 1735603200000,
  answers: {
    question_1: {
      score: 8,
      comment: 'Тестовый комментарий',
      photos: ['data:image/png;base64,AAAABBBB'],
    },
  },
  totalScore: 8,
  maxPossibleScore: 10,
  percentage: 80,
  reviewStatus: 'pending',
};

const resultWithoutCommentAndPhoto: QuizResult = {
  ...resultWithCommentAndPhoto,
  id: 'result_2',
  answers: {
    question_1: {
      score: 6,
      comment: '',
      photos: [],
    },
    question_missing: {
      score: 5,
    },
  },
  totalScore: 11,
  maxPossibleScore: 20,
  percentage: 55,
};

describe('reportBuilder', () => {
  it('builds per-result formatted/plain text and html including provided photos/comments', () => {
    const bundle = buildResultReportBundle({
      result: resultWithCommentAndPhoto,
      questionnaire,
      language: 'ru',
    });

    expect(bundle.formattedText).toContain('# Тестовый опросник');
    expect(bundle.formattedText).toContain('Сохраняю ли я спокойствие?');
    expect(bundle.formattedText).toContain('Письменный комментарий:');
    expect(bundle.formattedText).toContain('Фото 1: data:image/png;base64,AAAABBBB');
    expect(bundle.plainText).toContain('Вопрос 1: Сохраняю ли я спокойствие?');
    expect(bundle.html).toContain('<img src="data:image/png;base64,AAAABBBB"');
    expect(bundle.filenameBase).toContain('attempt');
  });

  it('does not print empty comment/photo blocks and hides question id in reports', () => {
    const bundle = buildResultReportBundle({
      result: resultWithoutCommentAndPhoto,
      questionnaire,
      language: 'en',
    });

    expect(bundle.formattedText).toContain('Question missing in current questionnaire');
    expect(bundle.formattedText).not.toContain('Question ID');
    expect(bundle.formattedText).not.toContain('Written comment:');
    expect(bundle.formattedText).not.toContain('Photos:');
    expect(bundle.html).not.toContain('Question ID');
    expect(bundle.html).not.toContain('<h5>Written comment</h5>');
    expect(bundle.html).not.toContain('<h5>Photos</h5>');
  });
});
