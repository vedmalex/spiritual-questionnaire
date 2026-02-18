import type { GradingDescription, GradingSystem } from '../types/questionnaire';
import { GRADING_DESCRIPTIONS } from './constants';

const DEFAULT_SCALE_MIN = 0;
const DEFAULT_SCALE_MAX = 10;
const MAX_RANGE_SIZE = 100;

const DEFAULT_MEANING_BY_SCORE = new Map<number, string>(
  GRADING_DESCRIPTIONS.map((entry) => [entry.score, entry.meaning])
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return fallback;
}

export function createScoreRange(scaleMin: number, scaleMax: number): number[] {
  const safeMin = toInteger(scaleMin, DEFAULT_SCALE_MIN);
  const safeMax = toInteger(scaleMax, DEFAULT_SCALE_MAX);

  if (safeMax < safeMin) {
    return [];
  }

  if (safeMax - safeMin > MAX_RANGE_SIZE) {
    return [];
  }

  return Array.from({ length: safeMax - safeMin + 1 }, (_, index) => safeMin + index);
}

export function getDefaultGradingSystem(): GradingSystem {
  return {
    scale_min: DEFAULT_SCALE_MIN,
    scale_max: DEFAULT_SCALE_MAX,
    description: GRADING_DESCRIPTIONS.map((entry) => ({ ...entry })),
  };
}

export function normalizeGradingSystemInput(input: unknown): GradingSystem {
  const fallback = getDefaultGradingSystem();
  if (!isRecord(input)) {
    return fallback;
  }

  let scaleMin = toInteger(input.scale_min, fallback.scale_min);
  let scaleMax = toInteger(input.scale_max, fallback.scale_max);
  if (scaleMin > scaleMax) {
    [scaleMin, scaleMax] = [scaleMax, scaleMin];
  }

  if (scaleMax - scaleMin > MAX_RANGE_SIZE) {
    scaleMin = fallback.scale_min;
    scaleMax = fallback.scale_max;
  }

  const range = createScoreRange(scaleMin, scaleMax);
  if (range.length === 0) {
    return fallback;
  }

  const meaningByScore = new Map<number, string>();
  if (Array.isArray(input.description)) {
    for (const entry of input.description) {
      if (!isRecord(entry)) {
        continue;
      }
      const score = toInteger(entry.score, Number.NaN);
      if (!Number.isFinite(score) || score < scaleMin || score > scaleMax) {
        continue;
      }
      const meaning = typeof entry.meaning === 'string' ? entry.meaning.trim() : '';
      if (!meaning) {
        continue;
      }
      meaningByScore.set(score, meaning);
    }
  }

  const description: GradingDescription[] = range.map((score) => ({
    score,
    meaning: meaningByScore.get(score) || DEFAULT_MEANING_BY_SCORE.get(score) || String(score),
  }));

  return {
    scale_min: scaleMin,
    scale_max: scaleMax,
    description,
  };
}

export function validateGradingSystemInput(input: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return ['grading_system должен быть объектом'];
  }

  const scaleMin = toInteger(input.scale_min, Number.NaN);
  const scaleMax = toInteger(input.scale_max, Number.NaN);
  if (!Number.isFinite(scaleMin) || !Number.isFinite(scaleMax)) {
    errors.push('grading_system.scale_min и grading_system.scale_max должны быть целыми числами');
    return errors;
  }

  if (scaleMin > scaleMax) {
    errors.push('grading_system.scale_min должен быть <= grading_system.scale_max');
  }

  if (scaleMax - scaleMin > MAX_RANGE_SIZE) {
    errors.push(`grading_system диапазон слишком большой (максимум ${MAX_RANGE_SIZE + 1} значений)`);
  }

  if (!Array.isArray(input.description) || input.description.length === 0) {
    errors.push('grading_system.description должен быть непустым массивом');
    return errors;
  }

  const byScore = new Map<number, string>();
  for (const [index, entry] of input.description.entries()) {
    if (!isRecord(entry)) {
      errors.push(`grading_system.description[${index}] должен быть объектом`);
      continue;
    }

    const score = toInteger(entry.score, Number.NaN);
    if (!Number.isFinite(score)) {
      errors.push(`grading_system.description[${index}].score должен быть числом`);
      continue;
    }
    if (score < scaleMin || score > scaleMax) {
      errors.push(
        `grading_system.description[${index}].score должен быть в диапазоне ${scaleMin}..${scaleMax}`
      );
    }
    if (byScore.has(score)) {
      errors.push(`grading_system.description содержит дублирующий score "${score}"`);
    }
    byScore.set(score, String(entry.meaning || ''));

    if (typeof entry.meaning !== 'string' || !entry.meaning.trim()) {
      errors.push(`grading_system.description[${index}].meaning должен быть непустой строкой`);
    }
  }

  const expectedScores = createScoreRange(scaleMin, scaleMax);
  if (expectedScores.length === 0) {
    errors.push('grading_system диапазон некорректен');
  } else {
    const missingScores = expectedScores.filter((score) => !byScore.has(score));
    if (missingScores.length > 0) {
      errors.push(
        `grading_system.description должен покрывать все значения шкалы (${missingScores.join(', ')})`
      );
    }
  }

  return errors;
}

export function getGradingMeaning(gradingSystem: GradingSystem, score: number): string {
  const roundedScore = Math.round(score);
  const fromQuestionnaire = gradingSystem.description.find((entry) => entry.score === roundedScore);
  if (fromQuestionnaire?.meaning?.trim()) {
    return fromQuestionnaire.meaning.trim();
  }

  return DEFAULT_MEANING_BY_SCORE.get(roundedScore) || String(roundedScore);
}

export function clampScoreToScale(score: number, gradingSystem: GradingSystem): number {
  return Math.max(gradingSystem.scale_min, Math.min(gradingSystem.scale_max, score));
}

export function calculateScalePercentage(
  totalScore: number,
  answersCount: number,
  gradingSystem: GradingSystem
): number {
  if (answersCount <= 0) {
    return 0;
  }

  const minTotal = answersCount * gradingSystem.scale_min;
  const maxTotal = answersCount * gradingSystem.scale_max;
  const denominator = maxTotal - minTotal;
  if (denominator <= 0) {
    return 0;
  }

  const raw = ((totalScore - minTotal) / denominator) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
