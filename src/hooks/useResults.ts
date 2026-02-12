import { useState, useEffect } from 'react';
import type { QuizResult } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import type { ResultsScope } from '../services/dataAdapter';
import { exportResults, type ExportFormat } from '../utils/exportUtils';
import {
  mergeImportedResults,
  parseResultsTransferPayload,
  type ImportStrategy,
  type ImportSummary,
} from '../utils/resultsTransfer';
import {
  annotateResultsWithSchemaStatus,
  reconcileImportedResults,
} from '../utils/reconciliation';

function normalizeUserName(name: string): string {
  return name.trim().toLowerCase();
}

function filterByOwner(results: QuizResult[], ownerName?: string): QuizResult[] {
  if (!ownerName?.trim()) {
    return results;
  }

  const owner = normalizeUserName(ownerName);
  return results.filter((result) => normalizeUserName(result.userName) === owner);
}

export function useResults(scope: ResultsScope = 'student', ownerName?: string, enabled = true) {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scope, ownerName]);

  const loadResults = async () => {
    if (!enabled) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      const [data, questionnaires] = await Promise.all([
        dataAdapter.getResults(scope),
        dataAdapter.getQuestionnaires(),
      ]);
      const scopedData = scope === 'student' ? filterByOwner(data, ownerName) : data;
      const normalizedResults = annotateResultsWithSchemaStatus(scopedData, questionnaires);
      // Sort by date descending
      normalizedResults.sort((a, b) => b.completedAt - a.completedAt);
      setResults(normalizedResults);
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResult = async (resultId: string) => {
    await dataAdapter.deleteResult(resultId, scope);
    setResults(prev => prev.filter(r => r.id !== resultId));
  };

  const updateResult = async (result: QuizResult) => {
    await dataAdapter.updateResult(result, scope);
    setResults((prev) => {
      const exists = prev.some((item) => item.id === result.id);
      const next = exists
        ? prev.map((item) => (item.id === result.id ? result : item))
        : [...prev, result];
      next.sort((a, b) => b.completedAt - a.completedAt);
      return next;
    });
  };

  const exportResult = (result: QuizResult, format: ExportFormat = 'json') => {
    exportResults([result], format, `quiz-result-${result.questionnaireTitle}-${Date.now()}.${format}`);
  };

  const exportAllResults = (format: ExportFormat = 'json') => {
    exportResults(results, format, `all-quiz-results-${Date.now()}.${format}`);
  };

  const importAllResults = async (
    file: File,
    strategy: ImportStrategy = 'replace'
  ): Promise<ImportSummary> => {
    const content = await file.text();
    const parsed = parseResultsTransferPayload(content);

    if (parsed.totalRaw === 0) {
      throw new Error('Файл не содержит результатов для импорта.');
    }

    const invalidCount = Math.max(parsed.totalRaw - parsed.valid.length, 0);
    const [existing, questionnaires] = await Promise.all([
      dataAdapter.getResults(scope),
      dataAdapter.getQuestionnaires(),
    ]);
    const reconciliationReport = reconcileImportedResults(parsed.valid, questionnaires);

    if (!reconciliationReport.compatible) {
      throw new Error(
        `Импорт остановлен: найдено ${reconciliationReport.missingQuestionnaires} результатов с отсутствующим опросником в текущих схемах.`
      );
    }
    if (reconciliationReport.missingQuestions > 0) {
      console.warn(
        `Import reconciliation warning: ${reconciliationReport.missingQuestions} answers reference questions absent in current schema.`
      );
    }

    const { merged, summary } = mergeImportedResults(
      existing,
      parsed.valid,
      strategy,
      invalidCount,
      {
        preferCuratorFeedbackReplace: scope === 'student',
      }
    );
    const normalizedMerged = annotateResultsWithSchemaStatus(merged, questionnaires);

    await dataAdapter.saveResults(normalizedMerged, scope);
    const nextResults = scope === 'student' ? filterByOwner(normalizedMerged, ownerName) : normalizedMerged;
    setResults(nextResults);

    return {
      ...summary,
      total: parsed.totalRaw,
    };
  };

  return {
    results,
    loading,
    deleteResult,
    updateResult,
    exportResult,
    exportAllResults,
    importAllResults,
    refresh: loadResults,
  };
}
