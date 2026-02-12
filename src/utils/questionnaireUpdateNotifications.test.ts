import { describe, expect, it } from 'vitest';

import {
  getNewQuestionnaireFiles,
  normalizeQuestionnaireIndexPayload,
} from './questionnaireUpdateNotifications';

describe('questionnaireUpdateNotifications', () => {
  describe('normalizeQuestionnaireIndexPayload', () => {
    it('returns unique and sorted JSON files', () => {
      const payload = ['b.json', 'a.json', 'a.json', 'not-json.txt', '  c.json  '];

      expect(normalizeQuestionnaireIndexPayload(payload)).toEqual(['a.json', 'b.json', 'c.json']);
    });

    it('returns empty array for invalid payload', () => {
      expect(normalizeQuestionnaireIndexPayload({})).toEqual([]);
      expect(normalizeQuestionnaireIndexPayload(null)).toEqual([]);
    });
  });

  describe('getNewQuestionnaireFiles', () => {
    it('returns files that were added since previous snapshot', () => {
      const previous = ['a.json', 'b.json'];
      const next = ['a.json', 'b.json', 'c.json', 'd.json'];

      expect(getNewQuestionnaireFiles(previous, next)).toEqual(['c.json', 'd.json']);
    });

    it('does not emit updates on the first snapshot', () => {
      expect(getNewQuestionnaireFiles([], ['a.json'])).toEqual([]);
    });
  });
});
