import { useState, useEffect, useCallback } from 'react';
import type { Questionnaire } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import { normalizeQuestionnaire } from '../utils/questionnaireSchema';

export function useQuestionnaires() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQuestionnaires = useCallback(async () => {
    try {
      const data = await dataAdapter.getQuestionnaires();
      setQuestionnaires(data);
    } catch (error) {
      console.error('Failed to load questionnaires:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestionnaires();
  }, [loadQuestionnaires]);

  const getQuestionnaireById = useCallback(async (id: string) => {
    return dataAdapter.getQuestionnaireById(id);
  }, []);

  const saveCustomQuestionnaire = useCallback(async (questionnaire: Questionnaire) => {
    const normalized = normalizeQuestionnaire(questionnaire);
    await dataAdapter.saveCustomQuestionnaire(normalized);
    await loadQuestionnaires();
    return normalized;
  }, [loadQuestionnaires]);

  const deleteCustomQuestionnaire = useCallback(async (qualityId: string) => {
    await dataAdapter.deleteCustomQuestionnaire(qualityId);
    await loadQuestionnaires();
  }, [loadQuestionnaires]);

  return {
    questionnaires,
    loading,
    getQuestionnaireById,
    refresh: loadQuestionnaires,
    saveCustomQuestionnaire,
    deleteCustomQuestionnaire,
  };
}
