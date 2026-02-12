// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import { useQuizSession } from './useQuizSession';

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

const localQuestionnaire: Questionnaire = {
  ...questionnaire,
  metadata: {
    ...questionnaire.metadata,
    quality: 'demo-quality',
  },
  source: 'local',
  runtimeId: 'local:demo-quality',
};

describe('useQuizSession', () => {
  beforeEach(() => {
    vi.spyOn(dataAdapter, 'getCurrentSession').mockResolvedValue(null);
    vi.spyOn(dataAdapter, 'getPausedSessions').mockResolvedValue([]);
    vi.spyOn(dataAdapter, 'saveSession').mockResolvedValue(undefined);
    vi.spyOn(dataAdapter, 'savePausedSessions').mockResolvedValue(undefined);
    vi.spyOn(dataAdapter, 'saveResult').mockResolvedValue(undefined);
    vi.spyOn(dataAdapter, 'clearSession').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates, updates, pauses and resumes a quiz session', async () => {
    const { result } = renderHook(() => useQuizSession('Alice', 'student'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession(questionnaire);
    });

    await waitFor(() => expect(result.current.session?.questionnaireId).toBe('demo-quality'));

    await act(async () => {
      await result.current.updateAnswer('q1', { score: 7, comment: 'reflection' });
    });

    expect(result.current.session?.answers.q1.score).toBe(7);

    await act(async () => {
      await result.current.pauseSession();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.pausedSessions).toHaveLength(1);
    expect(result.current.pausedSessions[0]?.questionnaireId).toBe('demo-quality');

    await act(async () => {
      await result.current.resumeSession('demo-quality');
    });

    expect(result.current.session?.status).toBe('active');
    expect(result.current.pausedSessions).toHaveLength(0);
  });

  it('resumes selected questionnaire when multiple quizzes are paused', async () => {
    const secondQuestionnaire: Questionnaire = {
      ...questionnaire,
      metadata: {
        ...questionnaire.metadata,
        quality: 'second-quality',
      },
    };

    const { result } = renderHook(() => useQuizSession('Alice', 'student'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession(questionnaire);
    });

    await act(async () => {
      await result.current.updateAnswer('q1', { score: 4 });
    });

    await act(async () => {
      await result.current.pauseSession();
    });

    await act(async () => {
      await result.current.createSession(secondQuestionnaire);
    });

    await act(async () => {
      await result.current.updateAnswer('q1', { score: 9 });
    });

    await act(async () => {
      await result.current.pauseSession();
    });

    expect(result.current.pausedSessions).toHaveLength(2);

    await act(async () => {
      await result.current.createSession(questionnaire);
    });

    expect(result.current.session?.questionnaireId).toBe('demo-quality');
    expect(result.current.session?.answers.q1?.score).toBe(4);
    expect(result.current.pausedSessions).toHaveLength(1);
    expect(result.current.pausedSessions[0]?.questionnaireId).toBe('second-quality');
  });

  it('completes active session and clears current slot', async () => {
    const { result } = renderHook(() => useQuizSession('Alice', 'student'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession(questionnaire);
    });

    await act(async () => {
      await result.current.updateAnswer('q1', { score: 7, comment: 'reflection' });
    });

    let completed: QuizResult | undefined;
    await act(async () => {
      completed = await result.current.completeSession(questionnaire);
    });

    expect(completed?.totalScore).toBe(7);
    expect(completed?.maxPossibleScore).toBe(10);
    expect(completed?.percentage).toBe(70);
    expect(result.current.session).toBeNull();
    expect(dataAdapter.saveResult).toHaveBeenCalledTimes(1);
    expect(dataAdapter.clearSession).toHaveBeenCalledTimes(1);
  });

  it('keeps local questionnaire answers isolated by runtime id', async () => {
    const { result } = renderHook(() => useQuizSession('Alice', 'student'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createSession(localQuestionnaire);
    });

    expect(result.current.session?.questionnaireId).toBe('local:demo-quality');
  });
});
