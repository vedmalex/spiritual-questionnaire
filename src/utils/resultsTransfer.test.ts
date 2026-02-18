import { describe, expect, it } from 'vitest';
import type { QuizResult } from '../types/questionnaire';
import { mergeImportedResults, parseResultsTransferPayload } from './resultsTransfer';

function createResult(overrides: Partial<QuizResult> = {}): QuizResult {
  return {
    id: 'result-1',
    questionnaireId: 'q-main',
    questionnaireTitle: 'Main Quiz',
    userName: 'Student',
    userRole: 'student',
    completedAt: 1739577600000,
    answers: {
      q1: {
        score: 6,
        comment: 'note',
      },
    },
    totalScore: 6,
    maxPossibleScore: 10,
    percentage: 60,
    reviewStatus: 'pending',
    absentInCurrentSchemaQuestionIds: [],
    ...overrides,
  };
}

describe('resultsTransfer', () => {
  it('parses and normalizes payload from object result array', () => {
    const content = JSON.stringify({
      results: [
        {
          id: 'parsed-1',
          questionnaireId: 'q-main',
          questionnaireTitle: 'Main Quiz',
          userName: 'Student',
          completedAt: '2026-02-11T12:00:00.000Z',
          answers: [{ questionId: 'q1', score: 12, comment: 'raw' }],
        },
      ],
    });

    const parsed = parseResultsTransferPayload(content);

    expect(parsed.totalRaw).toBe(1);
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.valid[0].answers.q1.score).toBe(12);
    expect(parsed.valid[0].userRole).toBe('student');
    expect(parsed.valid[0].reviewStatus).toBe('pending');
  });

  it('maps legacy approved status to needs_revision on import', () => {
    const content = JSON.stringify({
      results: [
        {
          id: 'parsed-approved',
          questionnaireId: 'q-main',
          questionnaireTitle: 'Main Quiz',
          userName: 'Student',
          completedAt: '2026-02-11T12:00:00.000Z',
          reviewStatus: 'approved',
          answers: [{ questionId: 'q1', score: 8 }],
        },
      ],
    });

    const parsed = parseResultsTransferPayload(content);

    expect(parsed.totalRaw).toBe(1);
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.valid[0].reviewStatus).toBe('needs_revision');
  });

  it('keeps computed_result rules payload on import when present', () => {
    const content = JSON.stringify({
      results: [
        {
          id: 'parsed-rules',
          questionnaireId: 'q-main',
          questionnaireTitle: 'Main Quiz',
          userName: 'Student',
          completedAt: '2026-02-11T12:00:00.000Z',
          answers: [{ questionId: 'q1', score: 1 }],
          computed_result: {
            version: 1,
            engine: 'rules-v1',
            metrics: {
              extraversion: 12,
            },
            ranking: ['extraversion'],
            honesty_checks: {
              all_passed: false,
              failed_count: 1,
              checks: [
                {
                  id: 'lie-scale',
                  passed: false,
                  value: 6,
                  severity: 'critical',
                },
              ],
            },
          },
        },
      ],
    });

    const parsed = parseResultsTransferPayload(content);

    expect(parsed.totalRaw).toBe(1);
    expect(parsed.valid[0].computed_result?.engine).toBe('rules-v1');
    expect(parsed.valid[0].computed_result?.metrics.extraversion).toBe(12);
    expect(parsed.valid[0].computed_result?.ranking).toEqual(['extraversion']);
    expect(parsed.valid[0].computed_result?.honesty_checks?.all_passed).toBe(false);
    expect(parsed.valid[0].computed_result?.honesty_checks?.failed_count).toBe(1);
    expect(parsed.valid[0].computed_result?.honesty_checks?.checks[0]?.id).toBe(
      'lie-scale'
    );
  });

  it('skips duplicates by fingerprint with skip strategy', () => {
    const existing = [createResult({ id: 'existing' })];
    const duplicateByFingerprint = [
      createResult({
        id: 'imported-different-id',
      }),
    ];

    const { merged, summary } = mergeImportedResults(existing, duplicateByFingerprint, 'skip');

    expect(merged).toHaveLength(1);
    expect(summary.imported).toBe(0);
    expect(summary.skipped).toBe(1);
  });

  it('replaces existing id with replace strategy', () => {
    const existing = [createResult({ id: 'same-id', totalScore: 4, percentage: 40 })];
    const imported = [createResult({ id: 'same-id', totalScore: 9, percentage: 90 })];

    const { merged, summary } = mergeImportedResults(existing, imported, 'replace');

    expect(summary.replaced).toBe(1);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalScore).toBe(9);
    expect(merged[0].percentage).toBe(90);
  });

  it('replaces existing result on skip strategy when imported result has curator feedback', () => {
    const existing = [createResult({ id: 'same-id', totalScore: 4, percentage: 40 })];
    const imported = [
      createResult({
        id: 'same-id',
        totalScore: 7,
        percentage: 70,
        answers: {
          q1: {
            score: 7,
            comment: 'updated',
            curatorFeedback: [
              {
                id: 'f1',
                curatorName: 'Curator',
                questionId: 'q1',
                comment: 'please revise',
                timestamp: 1739577600000,
                authorRole: 'curator',
                authorName: 'Curator',
              },
            ],
          },
        },
      }),
    ];

    const { merged, summary } = mergeImportedResults(existing, imported, 'skip', 0, {
      preferCuratorFeedbackReplace: true,
    });

    expect(summary.replaced).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(merged).toHaveLength(1);
    expect(merged[0].totalScore).toBe(7);
    expect(merged[0].answers.q1.curatorFeedback).toHaveLength(1);
  });
});
