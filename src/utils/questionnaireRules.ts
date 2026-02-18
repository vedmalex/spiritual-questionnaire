import type {
  AnswerDetails,
  Questionnaire,
  QuestionnaireProcessingRules,
  QuestionnaireRuleCheckSeverity,
  QuestionnaireRuleExpression,
  QuestionnaireRuleHonestyCheck,
  QuestionnaireRuleMetric,
} from '../types/questionnaire';

const MAX_RULE_DEPTH = 48;
const MAX_RULE_NODES = 3000;

interface ProcessingRulesParseResult {
  rules?: QuestionnaireProcessingRules;
  errors: string[];
}

export interface ProcessingRulesValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RulesEvaluationResult {
  applied: boolean;
  metrics: Record<string, number>;
  ranking: string[];
  honestyChecks?: {
    allPassed: boolean;
    failedCount: number;
    checks: Array<{
      id: string;
      passed: boolean;
      value: number;
      severity: QuestionnaireRuleCheckSeverity;
    }>;
  };
  scoreOverride?: {
    totalScore: number;
    maxPossibleScore: number;
    percentage: number;
  };
  errors: string[];
}

interface EvaluationState {
  answers: Record<string, AnswerDetails>;
  metricById: ReadonlyMap<string, QuestionnaireRuleMetric>;
  metricCache: Map<string, number>;
  evaluatingMetricIds: Set<string>;
  errors: string[];
  nodesVisited: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeFiniteNumber(value: unknown, fallback = 0): number {
  return isFiniteNumber(value) ? value : fallback;
}

function roundTo(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeLocalizedTextOrString(
  value: unknown,
  path: string,
  errors: string[]
): string | Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (!isRecord(value)) {
    errors.push(`${path} must be a string or localized object`);
    return undefined;
  }

  const localized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!normalizeNonEmptyString(key)) {
      errors.push(`${path} contains an empty language key`);
      continue;
    }
    if (typeof entry !== 'string') {
      errors.push(`${path}.${key} must be a string`);
      continue;
    }
    localized[key] = entry;
  }

  if (Object.keys(localized).length === 0) {
    errors.push(`${path} must contain at least one localized value`);
    return undefined;
  }

  return localized;
}

function normalizeExpression(
  input: unknown,
  path: string,
  errors: string[],
  depth = 0
): QuestionnaireRuleExpression | null {
  if (depth > MAX_RULE_DEPTH) {
    errors.push(`${path} exceeds max depth (${MAX_RULE_DEPTH})`);
    return null;
  }

  if (!isRecord(input)) {
    errors.push(`${path} must be an object`);
    return null;
  }

  const op = normalizeNonEmptyString(input.op);
  if (!op) {
    errors.push(`${path}.op is required`);
    return null;
  }

  switch (op) {
    case 'const': {
      if (!isFiniteNumber(input.value)) {
        errors.push(`${path}.value must be a finite number`);
        return null;
      }
      return {
        op: 'const',
        value: input.value,
      };
    }
    case 'answer': {
      const questionId = normalizeNonEmptyString(input.question_id);
      if (!questionId) {
        errors.push(`${path}.question_id is required`);
        return null;
      }
      if (input.default_value !== undefined && !isFiniteNumber(input.default_value)) {
        errors.push(`${path}.default_value must be a finite number`);
        return null;
      }
      return {
        op: 'answer',
        question_id: questionId,
        default_value: input.default_value,
      };
    }
    case 'metric': {
      const metricId = normalizeNonEmptyString(input.metric_id);
      if (!metricId) {
        errors.push(`${path}.metric_id is required`);
        return null;
      }
      if (input.default_value !== undefined && !isFiniteNumber(input.default_value)) {
        errors.push(`${path}.default_value must be a finite number`);
        return null;
      }
      return {
        op: 'metric',
        metric_id: metricId,
        default_value: input.default_value,
      };
    }
    case 'abs':
    case 'neg': {
      const arg = normalizeExpression(input.arg, `${path}.arg`, errors, depth + 1);
      if (!arg) {
        return null;
      }
      return {
        op,
        arg,
      };
    }
    case 'sum':
    case 'min':
    case 'max': {
      if (!Array.isArray(input.args) || input.args.length === 0) {
        errors.push(`${path}.args must be a non-empty array`);
        return null;
      }

      const args = input.args
        .map((entry, index) =>
          normalizeExpression(entry, `${path}.args[${index}]`, errors, depth + 1)
        )
        .filter((entry): entry is QuestionnaireRuleExpression => Boolean(entry));

      if (args.length !== input.args.length) {
        return null;
      }

      return {
        op,
        args,
      };
    }
    case 'sub':
    case 'mul':
    case 'div':
    case 'eq':
    case 'neq':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (!Array.isArray(input.args) || input.args.length !== 2) {
        errors.push(`${path}.args must contain exactly two expressions`);
        return null;
      }

      const left = normalizeExpression(input.args[0], `${path}.args[0]`, errors, depth + 1);
      const right = normalizeExpression(input.args[1], `${path}.args[1]`, errors, depth + 1);
      if (!left || !right) {
        return null;
      }

      if (op === 'div' && input.on_divide_by_zero !== undefined && !isFiniteNumber(input.on_divide_by_zero)) {
        errors.push(`${path}.on_divide_by_zero must be a finite number`);
        return null;
      }

      return {
        op,
        args: [left, right],
        ...(op === 'div' && isFiniteNumber(input.on_divide_by_zero)
          ? { on_divide_by_zero: input.on_divide_by_zero }
          : {}),
      };
    }
    case 'clamp': {
      const value = normalizeExpression(input.value, `${path}.value`, errors, depth + 1);
      if (!value) {
        return null;
      }
      if (!isFiniteNumber(input.min_value) || !isFiniteNumber(input.max_value)) {
        errors.push(`${path}.min_value and ${path}.max_value must be finite numbers`);
        return null;
      }
      if (input.min_value > input.max_value) {
        errors.push(`${path}.min_value must be <= max_value`);
        return null;
      }
      return {
        op: 'clamp',
        value,
        min_value: input.min_value,
        max_value: input.max_value,
      };
    }
    case 'if': {
      const condition = normalizeExpression(input.condition, `${path}.condition`, errors, depth + 1);
      const thenExpr = normalizeExpression(input.then, `${path}.then`, errors, depth + 1);
      const elseExpr = normalizeExpression(input.else, `${path}.else`, errors, depth + 1);
      if (!condition || !thenExpr || !elseExpr) {
        return null;
      }
      return {
        op: 'if',
        condition,
        then: thenExpr,
        else: elseExpr,
      };
    }
    case 'sum_answers': {
      if (!Array.isArray(input.question_ids) || input.question_ids.length === 0) {
        errors.push(`${path}.question_ids must be a non-empty string[]`);
        return null;
      }

      const questionIds: string[] = [];
      for (const [index, entry] of input.question_ids.entries()) {
        const normalized = normalizeNonEmptyString(entry);
        if (!normalized) {
          errors.push(`${path}.question_ids[${index}] must be a non-empty string`);
          continue;
        }
        questionIds.push(normalized);
      }

      if (questionIds.length !== input.question_ids.length) {
        return null;
      }

      if (input.weights !== undefined && !isRecord(input.weights)) {
        errors.push(`${path}.weights must be an object map of numbers`);
        return null;
      }

      const weights: Record<string, number> = {};
      if (isRecord(input.weights)) {
        for (const [key, value] of Object.entries(input.weights)) {
          const normalized = normalizeNonEmptyString(key);
          if (!normalized) {
            errors.push(`${path}.weights contains an empty question id key`);
            continue;
          }
          if (!isFiniteNumber(value)) {
            errors.push(`${path}.weights.${normalized} must be a finite number`);
            continue;
          }
          weights[normalized] = value;
        }
      }

      if (input.default_value !== undefined && !isFiniteNumber(input.default_value)) {
        errors.push(`${path}.default_value must be a finite number`);
        return null;
      }

      return {
        op: 'sum_answers',
        question_ids: questionIds,
        ...(Object.keys(weights).length > 0 ? { weights } : {}),
        ...(isFiniteNumber(input.default_value) ? { default_value: input.default_value } : {}),
      };
    }
    case 'count_matches': {
      if (!isRecord(input.expected_scores)) {
        errors.push(`${path}.expected_scores must be an object map of numbers`);
        return null;
      }

      const expectedScores: Record<string, number> = {};
      for (const [key, value] of Object.entries(input.expected_scores)) {
        const normalized = normalizeNonEmptyString(key);
        if (!normalized) {
          errors.push(`${path}.expected_scores contains an empty question id key`);
          continue;
        }
        if (!isFiniteNumber(value)) {
          errors.push(`${path}.expected_scores.${normalized} must be a finite number`);
          continue;
        }
        expectedScores[normalized] = value;
      }

      if (Object.keys(expectedScores).length === 0) {
        errors.push(`${path}.expected_scores must not be empty`);
        return null;
      }

      return {
        op: 'count_matches',
        expected_scores: expectedScores,
      };
    }
    default:
      errors.push(`${path}.op "${op}" is not supported`);
      return null;
  }
}

function normalizeMetric(
  input: unknown,
  path: string,
  errors: string[]
): QuestionnaireRuleMetric | null {
  if (!isRecord(input)) {
    errors.push(`${path} must be an object`);
    return null;
  }

  const id = normalizeNonEmptyString(input.id);
  if (!id) {
    errors.push(`${path}.id is required`);
    return null;
  }

  const title = normalizeLocalizedTextOrString(input.title, `${path}.title`, errors);
  const description = normalizeLocalizedTextOrString(
    input.description,
    `${path}.description`,
    errors
  );
  const expression = normalizeExpression(input.expression, `${path}.expression`, errors);
  if (!expression) {
    return null;
  }

  if (input.precision !== undefined) {
    if (!Number.isInteger(input.precision) || input.precision < 0 || input.precision > 6) {
      errors.push(`${path}.precision must be an integer between 0 and 6`);
      return null;
    }
  }

  return {
    id,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    expression,
    ...(input.precision !== undefined ? { precision: input.precision } : {}),
  };
}

function normalizeCheckSeverity(
  value: unknown,
  path: string,
  errors: string[]
): QuestionnaireRuleCheckSeverity | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = normalizeNonEmptyString(value);
  if (!normalized) {
    errors.push(`${path} must be a non-empty string`);
    return undefined;
  }

  if (normalized === 'info' || normalized === 'warning' || normalized === 'critical') {
    return normalized;
  }

  errors.push(`${path} must be one of: info, warning, critical`);
  return undefined;
}

function normalizeHonestyCheck(
  input: unknown,
  path: string,
  errors: string[]
): QuestionnaireRuleHonestyCheck | null {
  if (!isRecord(input)) {
    errors.push(`${path} must be an object`);
    return null;
  }

  const id = normalizeNonEmptyString(input.id);
  if (!id) {
    errors.push(`${path}.id is required`);
    return null;
  }

  const title = normalizeLocalizedTextOrString(input.title, `${path}.title`, errors);
  const description = normalizeLocalizedTextOrString(
    input.description,
    `${path}.description`,
    errors
  );
  const passExpression = normalizeExpression(
    input.pass_expression,
    `${path}.pass_expression`,
    errors
  );
  if (!passExpression) {
    return null;
  }

  const valueExpression =
    input.value_expression !== undefined
      ? normalizeExpression(input.value_expression, `${path}.value_expression`, errors)
      : undefined;
  const severity = normalizeCheckSeverity(input.severity, `${path}.severity`, errors);

  return {
    id,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    pass_expression: passExpression,
    ...(valueExpression ? { value_expression: valueExpression } : {}),
    ...(severity ? { severity } : {}),
  };
}

function parseProcessingRules(input: unknown): ProcessingRulesParseResult {
  if (input === undefined) {
    return { rules: undefined, errors: [] };
  }

  const errors: string[] = [];
  if (!isRecord(input)) {
    return { errors: ['processing_rules must be an object'] };
  }

  const versionRaw = input.version;
  const version = versionRaw === undefined ? 1 : versionRaw;
  if (version !== 1) {
    errors.push('processing_rules.version must be 1');
  }

  if (input.metrics !== undefined && !Array.isArray(input.metrics)) {
    errors.push('processing_rules.metrics must be an array');
  }

  const rawMetrics = Array.isArray(input.metrics) ? input.metrics : [];
  const metrics = rawMetrics
    ? rawMetrics
        .map((metric, index) =>
          normalizeMetric(metric, `processing_rules.metrics[${index}]`, errors)
        )
        .filter((metric): metric is QuestionnaireRuleMetric => Boolean(metric))
    : [];

  const metricIds = new Set<string>();
  for (const metric of metrics) {
    if (metricIds.has(metric.id)) {
      errors.push(`processing_rules.metrics contains duplicate id "${metric.id}"`);
      continue;
    }
    metricIds.add(metric.id);
  }

  let score: QuestionnaireProcessingRules['score'];
  if (input.score !== undefined) {
    if (!isRecord(input.score)) {
      errors.push('processing_rules.score must be an object');
    } else {
      const totalExpression = normalizeExpression(
        input.score.total_expression,
        'processing_rules.score.total_expression',
        errors
      );
      const maxExpression = normalizeExpression(
        input.score.max_expression,
        'processing_rules.score.max_expression',
        errors
      );
      const percentageExpression =
        input.score.percentage_expression !== undefined
          ? normalizeExpression(
              input.score.percentage_expression,
              'processing_rules.score.percentage_expression',
              errors
            )
          : undefined;

      if (
        input.score.clamp_percentage !== undefined &&
        typeof input.score.clamp_percentage !== 'boolean'
      ) {
        errors.push('processing_rules.score.clamp_percentage must be a boolean');
      }

      if (totalExpression && maxExpression) {
        score = {
          total_expression: totalExpression,
          max_expression: maxExpression,
          ...(percentageExpression ? { percentage_expression: percentageExpression } : {}),
          ...(typeof input.score.clamp_percentage === 'boolean'
            ? { clamp_percentage: input.score.clamp_percentage }
            : {}),
        };
      }
    }
  }

  let ranking: QuestionnaireProcessingRules['ranking'];
  if (input.ranking !== undefined) {
    if (!isRecord(input.ranking)) {
      errors.push('processing_rules.ranking must be an object');
    } else {
      const metricIdsFromRanking: string[] = [];
      if (input.ranking.metric_ids !== undefined) {
        if (!Array.isArray(input.ranking.metric_ids)) {
          errors.push('processing_rules.ranking.metric_ids must be string[]');
        } else {
          for (const [index, entry] of input.ranking.metric_ids.entries()) {
            const id = normalizeNonEmptyString(entry);
            if (!id) {
              errors.push(`processing_rules.ranking.metric_ids[${index}] must be a non-empty string`);
              continue;
            }
            if (!metricIds.has(id)) {
              errors.push(`processing_rules.ranking.metric_ids references unknown metric "${id}"`);
              continue;
            }
            metricIdsFromRanking.push(id);
          }
        }
      }

      if (input.ranking.top_n !== undefined) {
        if (!Number.isInteger(input.ranking.top_n) || input.ranking.top_n <= 0) {
          errors.push('processing_rules.ranking.top_n must be a positive integer');
        }
      }

      if (
        metricIdsFromRanking.length > 0 ||
        Number.isInteger(input.ranking.top_n)
      ) {
        ranking = {
          ...(metricIdsFromRanking.length > 0 ? { metric_ids: metricIdsFromRanking } : {}),
          ...(Number.isInteger(input.ranking.top_n)
            ? { top_n: input.ranking.top_n as number }
            : {}),
        };
      }
    }
  }

  let honestyChecks: QuestionnaireProcessingRules['honesty_checks'];
  if (input.honesty_checks !== undefined) {
    if (!Array.isArray(input.honesty_checks)) {
      errors.push('processing_rules.honesty_checks must be an array');
    } else if (input.honesty_checks.length === 0) {
      errors.push('processing_rules.honesty_checks must not be empty');
    } else {
      const checks = input.honesty_checks
        .map((check, index) =>
          normalizeHonestyCheck(check, `processing_rules.honesty_checks[${index}]`, errors)
        )
        .filter((check): check is QuestionnaireRuleHonestyCheck => Boolean(check));

      const checkIds = new Set<string>();
      for (const check of checks) {
        if (checkIds.has(check.id)) {
          errors.push(
            `processing_rules.honesty_checks contains duplicate id "${check.id}"`
          );
          continue;
        }
        checkIds.add(check.id);
      }

      if (checks.length > 0) {
        honestyChecks = checks;
      }
    }
  }

  const hasExecutableRules = metrics.length > 0 || Boolean(score) || Boolean(honestyChecks);
  if (!hasExecutableRules) {
    errors.push(
      'processing_rules must define at least one executable block: metrics, score, or honesty_checks'
    );
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    rules: {
      version: 1,
      metrics,
      ...(score ? { score } : {}),
      ...(ranking ? { ranking } : {}),
      ...(honestyChecks ? { honesty_checks: honestyChecks } : {}),
    },
    errors: [],
  };
}

export function validateQuestionnaireProcessingRules(
  input: unknown
): ProcessingRulesValidationResult {
  const { errors } = parseProcessingRules(input);
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeQuestionnaireProcessingRules(
  input: unknown
): QuestionnaireProcessingRules | undefined {
  const { rules, errors } = parseProcessingRules(input);
  if (errors.length > 0) {
    return undefined;
  }

  return rules;
}

function readAnswerScore(
  answers: Record<string, AnswerDetails>,
  questionId: string,
  defaultValue = 0
): number {
  const score = answers[questionId]?.score;
  return isFiniteNumber(score) ? score : defaultValue;
}

function evaluateMetric(metricId: string, state: EvaluationState, depth: number): number {
  if (state.metricCache.has(metricId)) {
    return state.metricCache.get(metricId) || 0;
  }

  if (state.evaluatingMetricIds.has(metricId)) {
    state.errors.push(`processing_rules cycle detected for metric "${metricId}"`);
    return 0;
  }

  const metric = state.metricById.get(metricId);
  if (!metric) {
    state.errors.push(`processing_rules references unknown metric "${metricId}"`);
    return 0;
  }

  state.evaluatingMetricIds.add(metricId);
  const value = evaluateExpression(metric.expression, state, depth + 1);
  state.evaluatingMetricIds.delete(metricId);

  const normalizedValue = metric.precision !== undefined ? roundTo(value, metric.precision) : value;
  state.metricCache.set(metricId, normalizedValue);
  return normalizedValue;
}

function evaluateExpression(
  expression: QuestionnaireRuleExpression,
  state: EvaluationState,
  depth: number
): number {
  if (depth > MAX_RULE_DEPTH) {
    state.errors.push(`processing_rules evaluation exceeds max depth (${MAX_RULE_DEPTH})`);
    return 0;
  }

  state.nodesVisited += 1;
  if (state.nodesVisited > MAX_RULE_NODES) {
    state.errors.push(`processing_rules evaluation exceeds max nodes (${MAX_RULE_NODES})`);
    return 0;
  }

  switch (expression.op) {
    case 'const':
      return expression.value;
    case 'answer':
      return readAnswerScore(
        state.answers,
        expression.question_id,
        normalizeFiniteNumber(expression.default_value, 0)
      );
    case 'metric':
      if (!state.metricById.has(expression.metric_id)) {
        return normalizeFiniteNumber(expression.default_value, 0);
      }
      return evaluateMetric(expression.metric_id, state, depth + 1);
    case 'abs':
      return Math.abs(evaluateExpression(expression.arg, state, depth + 1));
    case 'neg':
      return -evaluateExpression(expression.arg, state, depth + 1);
    case 'sum':
      return expression.args.reduce(
        (sum, entry) => sum + evaluateExpression(entry, state, depth + 1),
        0
      );
    case 'min':
      return Math.min(...expression.args.map((entry) => evaluateExpression(entry, state, depth + 1)));
    case 'max':
      return Math.max(...expression.args.map((entry) => evaluateExpression(entry, state, depth + 1)));
    case 'sub':
      return (
        evaluateExpression(expression.args[0], state, depth + 1) -
        evaluateExpression(expression.args[1], state, depth + 1)
      );
    case 'mul':
      return (
        evaluateExpression(expression.args[0], state, depth + 1) *
        evaluateExpression(expression.args[1], state, depth + 1)
      );
    case 'div': {
      const left = evaluateExpression(expression.args[0], state, depth + 1);
      const right = evaluateExpression(expression.args[1], state, depth + 1);
      if (Math.abs(right) < Number.EPSILON) {
        return normalizeFiniteNumber(expression.on_divide_by_zero, 0);
      }
      return left / right;
    }
    case 'eq':
      return evaluateExpression(expression.args[0], state, depth + 1) ===
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'neq':
      return evaluateExpression(expression.args[0], state, depth + 1) !==
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'gt':
      return evaluateExpression(expression.args[0], state, depth + 1) >
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'gte':
      return evaluateExpression(expression.args[0], state, depth + 1) >=
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'lt':
      return evaluateExpression(expression.args[0], state, depth + 1) <
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'lte':
      return evaluateExpression(expression.args[0], state, depth + 1) <=
        evaluateExpression(expression.args[1], state, depth + 1)
        ? 1
        : 0;
    case 'clamp': {
      const raw = evaluateExpression(expression.value, state, depth + 1);
      return Math.max(expression.min_value, Math.min(expression.max_value, raw));
    }
    case 'if':
      return evaluateExpression(expression.condition, state, depth + 1) !== 0
        ? evaluateExpression(expression.then, state, depth + 1)
        : evaluateExpression(expression.else, state, depth + 1);
    case 'sum_answers':
      return expression.question_ids.reduce((sum, questionId) => {
        const weight = normalizeFiniteNumber(expression.weights?.[questionId], 1);
        const answerScore = readAnswerScore(
          state.answers,
          questionId,
          normalizeFiniteNumber(expression.default_value, 0)
        );
        return sum + answerScore * weight;
      }, 0);
    case 'count_matches':
      return Object.entries(expression.expected_scores).reduce((sum, [questionId, expected]) => {
        const answerScore = readAnswerScore(state.answers, questionId, 0);
        return sum + (answerScore === expected ? 1 : 0);
      }, 0);
    default:
      return 0;
  }
}

export function evaluateQuestionnaireProcessingRules(
  questionnaire: Questionnaire,
  answers: Record<string, AnswerDetails>
): RulesEvaluationResult {
  const rules = questionnaire.processing_rules;
  const hasExecutableRules =
    Boolean(rules) &&
    (rules.metrics.length > 0 || Boolean(rules.score) || Boolean(rules.honesty_checks?.length));
  if (!hasExecutableRules || !rules) {
    return {
      applied: false,
      metrics: {},
      ranking: [],
      errors: [],
    };
  }

  const metricById = new Map<string, QuestionnaireRuleMetric>(
    rules.metrics.map((metric) => [metric.id, metric])
  );

  const state: EvaluationState = {
    answers,
    metricById,
    metricCache: new Map<string, number>(),
    evaluatingMetricIds: new Set<string>(),
    errors: [],
    nodesVisited: 0,
  };

  for (const metric of rules.metrics) {
    evaluateMetric(metric.id, state, 0);
  }

  const metrics = Object.fromEntries(state.metricCache.entries());

  const rankingSource =
    rules.ranking?.metric_ids?.filter((metricId) => Object.hasOwn(metrics, metricId)) ||
    Object.keys(metrics);

  const ranking = Array.from(new Set(rankingSource)).sort((left, right) => {
    const leftValue = normalizeFiniteNumber(metrics[left], 0);
    const rightValue = normalizeFiniteNumber(metrics[right], 0);
    return rightValue - leftValue;
  });

  const topN = rules.ranking?.top_n;
  const rankingResult =
    typeof topN === 'number' && topN > 0 ? ranking.slice(0, topN) : ranking;

  let scoreOverride: RulesEvaluationResult['scoreOverride'];
  if (rules.score) {
    const totalScore = evaluateExpression(rules.score.total_expression, state, 0);
    const maxPossibleScore = evaluateExpression(rules.score.max_expression, state, 0);

    if (maxPossibleScore <= 0) {
      state.errors.push('processing_rules.score.max_expression must evaluate to a value > 0');
    } else {
      const rawPercentage =
        rules.score.percentage_expression !== undefined
          ? evaluateExpression(rules.score.percentage_expression, state, 0)
          : (totalScore / maxPossibleScore) * 100;
      const clampPercentage = rules.score.clamp_percentage !== false;
      const percentage = clampPercentage
        ? Math.max(0, Math.min(100, rawPercentage))
        : rawPercentage;

      scoreOverride = {
        totalScore: roundTo(totalScore),
        maxPossibleScore: roundTo(maxPossibleScore),
        percentage: Math.round(percentage),
      };
    }
  }

  let honestyChecks: RulesEvaluationResult['honestyChecks'];
  if (rules.honesty_checks && rules.honesty_checks.length > 0) {
    const checks = rules.honesty_checks.map((check) => {
      const passValue = evaluateExpression(check.pass_expression, state, 0);
      const reportedValue =
        check.value_expression !== undefined
          ? evaluateExpression(check.value_expression, state, 0)
          : passValue;

      return {
        id: check.id,
        passed: passValue !== 0,
        value: roundTo(reportedValue),
        severity: check.severity || 'warning',
      };
    });

    const failedCount = checks.filter((check) => !check.passed).length;
    honestyChecks = {
      allPassed: failedCount === 0,
      failedCount,
      checks,
    };
  }

  return {
    applied: true,
    metrics,
    ranking: rankingResult,
    ...(honestyChecks ? { honestyChecks } : {}),
    ...(scoreOverride ? { scoreOverride } : {}),
    errors: Array.from(new Set(state.errors)),
  };
}
