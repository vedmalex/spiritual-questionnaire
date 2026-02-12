// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import { useResults } from './useResults';

const questionnaire: Questionnaire = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Spiritual Assessment Structure',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
  metadata: {
    title: 'Demo',
    source_lecture: 'Lecture',
    quality: 'demo-quality',
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [{ score: 0, meaning: 'none' }],
  },
  questions: [
    {
      id: 'q1',
      question: 'Question 1',
      context_sources: ['source'],
      self_check_prompts: ['prompt'],
      requires_comment: false,
      user_score: null,
    },
  ],
};

const existingResult: QuizResult = {
  id: 'result-existing',
  questionnaireId: 'demo-quality',
  questionnaireTitle: 'Demo',
  userName: 'Alice',
  userRole: 'student',
  completedAt: 1739577600000,
  answers: {
    q1: {
      score: 5,
      comment: 'note',
    },
  },
  totalScore: 5,
  maxPossibleScore: 10,
  percentage: 50,
  reviewStatus: 'pending',
  absentInCurrentSchemaQuestionIds: [],
};

describe('useResults', () => {
  beforeEach(() => {
    vi.spyOn(dataAdapter, 'getResults').mockResolvedValue([existingResult]);
    vi.spyOn(dataAdapter, 'getQuestionnaires').mockResolvedValue([questionnaire]);
    vi.spyOn(dataAdapter, 'deleteResult').mockResolvedValue(undefined);
    vi.spyOn(dataAdapter, 'updateResult').mockResolvedValue(undefined);
    vi.spyOn(dataAdapter, 'saveResults').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and deletes results', async () => {
    const { result } = renderHook(() => useResults());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toHaveLength(1);

    await act(async () => {
      await result.current.deleteResult(existingResult.id);
    });

    expect(dataAdapter.deleteResult).toHaveBeenCalledWith(existingResult.id, 'student');
    expect(result.current.results).toHaveLength(0);
  });

  it('imports transfer payload and merges with existing results', async () => {
    const { result } = renderHook(() => useResults());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const imported: QuizResult = {
      ...existingResult,
      id: 'result-imported',
      completedAt: 1739664000000,
      totalScore: 8,
      percentage: 80,
      answers: {
        q1: {
          score: 8,
          comment: 'imported',
        },
      },
    };

    const file = {
      text: async () =>
        JSON.stringify({
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          totalResults: 1,
          results: [imported],
        }),
    } as unknown as File;

    let summary:
      | {
          total: number;
          imported: number;
          replaced: number;
          skipped: number;
          invalid: number;
        }
      | undefined;

    await act(async () => {
      summary = await result.current.importAllResults(file, 'skip');
    });

    expect(summary).toEqual({
      total: 1,
      imported: 1,
      replaced: 0,
      skipped: 0,
      invalid: 0,
    });
    expect(dataAdapter.saveResults).toHaveBeenCalledTimes(1);
    expect(result.current.results).toHaveLength(2);
  });

  it('does not load results when disabled', async () => {
    const { result } = renderHook(() => useResults('student', undefined, false));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual([]);
    expect(dataAdapter.getResults).not.toHaveBeenCalled();
    expect(dataAdapter.getQuestionnaires).not.toHaveBeenCalled();
  });
});
