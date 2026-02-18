import { describe, expect, it } from 'vitest';
import type { Questionnaire } from '../types/questionnaire';
import {
  evaluateQuestionnaireProcessingRules,
  normalizeQuestionnaireProcessingRules,
  validateQuestionnaireProcessingRules,
} from './questionnaireRules';

const baseQuestionnaire: Questionnaire = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'Spiritual Assessment Structure',
  type: 'object',
  required: ['metadata', 'grading_system', 'questions'],
  metadata: {
    title: 'Rules Demo',
    source_lecture: 'Lecture',
    quality: 'rules-demo',
  },
  grading_system: {
    scale_min: 0,
    scale_max: 10,
    description: [{ score: 0, meaning: 'none' }],
  },
  questions: [
    {
      id: 'q1',
      question: 'Q1',
      context_sources: ['source'],
      self_check_prompts: ['prompt'],
      requires_comment: false,
      user_score: null,
    },
    {
      id: 'q2',
      question: 'Q2',
      context_sources: ['source'],
      self_check_prompts: ['prompt'],
      requires_comment: false,
      user_score: null,
    },
    {
      id: 'q3',
      question: 'Q3',
      context_sources: ['source'],
      self_check_prompts: ['prompt'],
      requires_comment: false,
      user_score: null,
    },
    {
      id: 'q4',
      question: 'Q4',
      context_sources: ['source'],
      self_check_prompts: ['prompt'],
      requires_comment: false,
      user_score: null,
    },
  ],
};

describe('questionnaireRules', () => {
  it('normalizes and validates a safe processing_rules block', () => {
    const rules = normalizeQuestionnaireProcessingRules({
      metrics: [
        {
          id: 'type_a',
          expression: {
            op: 'sum_answers',
            question_ids: ['q1', 'q2'],
          },
        },
      ],
      ranking: {
        metric_ids: ['type_a'],
        top_n: 1,
      },
    });

    expect(rules).toBeDefined();
    expect(rules?.version).toBe(1);
    expect(rules?.metrics[0]?.id).toBe('type_a');
  });

  it('rejects invalid rule expression structures', () => {
    const validation = validateQuestionnaireProcessingRules({
      version: 1,
      metrics: [
        {
          id: 'broken',
          expression: {
            op: 'eval',
            code: 'alert(1)',
          },
        },
      ],
    });

    expect(validation.valid).toBe(false);
    expect(
      validation.errors.some((error) => error.includes('not supported'))
    ).toBe(true);
  });

  it('evaluates weighted metrics, ranking and score override', () => {
    const questionnaire: Questionnaire = {
      ...baseQuestionnaire,
      processing_rules: {
        version: 1,
        metrics: [
          {
            id: 'channel_visual',
            expression: {
              op: 'sum_answers',
              question_ids: ['q1', 'q2'],
              weights: {
                q1: 2,
                q2: 1,
              },
            },
          },
          {
            id: 'channel_audio',
            expression: {
              op: 'sum_answers',
              question_ids: ['q3', 'q4'],
            },
          },
        ],
        score: {
          total_expression: {
            op: 'sum',
            args: [
              { op: 'metric', metric_id: 'channel_visual' },
              { op: 'metric', metric_id: 'channel_audio' },
            ],
          },
          max_expression: { op: 'const', value: 10 },
        },
        ranking: {
          metric_ids: ['channel_visual', 'channel_audio'],
          top_n: 1,
        },
      },
    };

    const evaluation = evaluateQuestionnaireProcessingRules(questionnaire, {
      q1: { score: 1 },
      q2: { score: 1 },
      q3: { score: 0 },
      q4: { score: 1 },
    });

    expect(evaluation.applied).toBe(true);
    expect(evaluation.metrics.channel_visual).toBe(3);
    expect(evaluation.metrics.channel_audio).toBe(1);
    expect(evaluation.ranking).toEqual(['channel_visual']);
    expect(evaluation.scoreOverride?.totalScore).toBe(4);
    expect(evaluation.scoreOverride?.maxPossibleScore).toBe(10);
    expect(evaluation.scoreOverride?.percentage).toBe(40);
    expect(evaluation.errors).toEqual([]);
  });

  it('supports key-style count_matches calculations', () => {
    const questionnaire: Questionnaire = {
      ...baseQuestionnaire,
      processing_rules: {
        version: 1,
        metrics: [
          {
            id: 'truth_scale',
            expression: {
              op: 'count_matches',
              expected_scores: {
                q1: 1,
                q2: 0,
                q3: 1,
              },
            },
          },
        ],
      },
    };

    const evaluation = evaluateQuestionnaireProcessingRules(questionnaire, {
      q1: { score: 1 },
      q2: { score: 0 },
      q3: { score: 0 },
    });

    expect(evaluation.metrics.truth_scale).toBe(2);
    expect(evaluation.errors).toEqual([]);
  });

  it('evaluates honesty checks with severity and fail summary', () => {
    const questionnaire: Questionnaire = {
      ...baseQuestionnaire,
      processing_rules: {
        version: 1,
        metrics: [
          {
            id: 'lie_scale',
            expression: {
              op: 'count_matches',
              expected_scores: {
                q1: 1,
                q2: 0,
              },
            },
          },
        ],
        honesty_checks: [
          {
            id: 'lie_scale_gate',
            pass_expression: {
              op: 'lte',
              args: [
                { op: 'metric', metric_id: 'lie_scale' },
                { op: 'const', value: 0 },
              ],
            },
            value_expression: { op: 'metric', metric_id: 'lie_scale' },
            severity: 'critical',
          },
        ],
      },
    };

    const evaluation = evaluateQuestionnaireProcessingRules(questionnaire, {
      q1: { score: 1 },
      q2: { score: 1 },
    });

    expect(evaluation.metrics.lie_scale).toBe(1);
    expect(evaluation.honestyChecks?.allPassed).toBe(false);
    expect(evaluation.honestyChecks?.failedCount).toBe(1);
    expect(evaluation.honestyChecks?.checks).toEqual([
      {
        id: 'lie_scale_gate',
        passed: false,
        value: 1,
        severity: 'critical',
      },
    ]);
  });

  it('reports metric dependency cycles without crashing', () => {
    const questionnaire: Questionnaire = {
      ...baseQuestionnaire,
      processing_rules: {
        version: 1,
        metrics: [
          {
            id: 'a',
            expression: {
              op: 'sum',
              args: [
                { op: 'metric', metric_id: 'b' },
                { op: 'const', value: 1 },
              ],
            },
          },
          {
            id: 'b',
            expression: {
              op: 'sum',
              args: [
                { op: 'metric', metric_id: 'a' },
                { op: 'const', value: 1 },
              ],
            },
          },
        ],
      },
    };

    const evaluation = evaluateQuestionnaireProcessingRules(questionnaire, {
      q1: { score: 1 },
    });

    expect(evaluation.applied).toBe(true);
    expect(
      evaluation.errors.some((error) => error.includes('cycle detected'))
    ).toBe(true);
  });
});
