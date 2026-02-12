import { describe, expect, it } from 'vitest';
import {
  getFormTranslationCoverage,
  summarizeFormTranslationCoverage,
} from './formTranslationCoverage';

describe('formTranslationCoverage', () => {
  it('ensures all required form translation keys are present for ru/en', () => {
    const entries = getFormTranslationCoverage(['ru', 'en']);
    const summary = summarizeFormTranslationCoverage(entries);

    expect(entries.every((entry) => entry.fullyCovered)).toBe(true);
    expect(summary.totalMissingKeys).toBe(0);
    expect(summary.languageMissingTotals.ru).toBe(0);
    expect(summary.languageMissingTotals.en).toBe(0);
  });
});
