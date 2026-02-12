import { useState, useEffect, useCallback, useRef } from 'react';
import type { Questionnaire } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import { normalizeQuestionnaire } from '../utils/questionnaireSchema';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';
import {
  loadQuestionnairesFromSources,
  type QuestionnaireLoadProgress,
} from '../services/questionnaireCatalogService';

const MAX_SERVER_LOAD_ATTEMPTS = 3;
const SERVER_RETRY_DELAY_MS = 2000;
const AUTO_RETRY_INTERVAL_MS = 15000;

export type QuestionnaireLoadState =
  | 'idle'
  | 'loading'
  | 'retrying'
  | 'ready'
  | 'degraded'
  | 'error';

export interface QuestionnaireLoadStatus {
  state: QuestionnaireLoadState;
  attempt: number;
  maxAttempts: number;
  staticCount: number;
  localCount: number;
  lastError?: string;
  nextRetryAt?: number;
}

const initialLoadStatus: QuestionnaireLoadStatus = {
  state: 'idle',
  attempt: 0,
  maxAttempts: MAX_SERVER_LOAD_ATTEMPTS,
  staticCount: 0,
  localCount: 0,
};

export function useQuestionnaires() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<QuestionnaireLoadStatus>(initialLoadStatus);
  const retryTimerRef = useRef<number | null>(null);
  const loadQuestionnairesRef = useRef<((options?: { showSpinner?: boolean; source?: 'initial' | 'manual' | 'auto' }) => Promise<void>) | null>(null);

  const clearAutoRetry = useCallback(() => {
    if (retryTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const scheduleAutoRetry = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    clearAutoRetry();
    const nextRetryAt = Date.now() + AUTO_RETRY_INTERVAL_MS;
    setServerStatus((prev) => ({
      ...prev,
      nextRetryAt,
    }));

    retryTimerRef.current = window.setTimeout(() => {
      const load = loadQuestionnairesRef.current;
      if (!load) {
        return;
      }
      void load({
        showSpinner: false,
        source: 'auto',
      });
    }, AUTO_RETRY_INTERVAL_MS);
  }, [clearAutoRetry]);

  const loadQuestionnaires = useCallback(async (options?: {
    showSpinner?: boolean;
    source?: 'initial' | 'manual' | 'auto';
  }) => {
    const source = options?.source || 'manual';
    const showSpinner = options?.showSpinner ?? source !== 'auto';

    if (showSpinner) {
      setLoading(true);
    }
    clearAutoRetry();

    try {
      const data = await loadQuestionnairesFromSources({
        maxAttempts: MAX_SERVER_LOAD_ATTEMPTS,
        retryDelayMs: SERVER_RETRY_DELAY_MS,
        onProgress: (progress: QuestionnaireLoadProgress) => {
          setServerStatus((prev) => ({
            ...prev,
            state: progress.state,
            attempt: progress.attempt,
            maxAttempts: progress.maxAttempts,
            lastError: progress.lastError,
            nextRetryAt: undefined,
          }));
        },
      });

      setQuestionnaires(data.questionnaires);

      const nextStatus: QuestionnaireLoadStatus = {
        state: data.staticLoaded ? 'ready' : data.localCount > 0 ? 'degraded' : 'error',
        attempt: data.attempts,
        maxAttempts: data.maxAttempts,
        staticCount: data.staticCount,
        localCount: data.localCount,
        lastError: data.lastError,
      };
      setServerStatus(nextStatus);

      if (!data.staticLoaded) {
        scheduleAutoRetry();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load questionnaires:', error);
      setServerStatus((prev) => ({
        ...prev,
        state: prev.localCount > 0 ? 'degraded' : 'error',
        lastError: message,
      }));
      scheduleAutoRetry();
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [clearAutoRetry, scheduleAutoRetry]);

  useEffect(() => {
    loadQuestionnairesRef.current = loadQuestionnaires;
  }, [loadQuestionnaires]);

  useEffect(() => {
    void loadQuestionnaires({
      showSpinner: true,
      source: 'initial',
    });

    return () => {
      clearAutoRetry();
    };
  }, [clearAutoRetry, loadQuestionnaires]);

  const getQuestionnaireById = useCallback(async (id: string) => {
    const inMemory = questionnaires.find((questionnaire) => {
      return (
        getQuestionnaireRuntimeId(questionnaire) === id ||
        questionnaire.metadata.quality === id
      );
    });
    if (inMemory) {
      return inMemory;
    }
    return dataAdapter.getQuestionnaireById(id);
  }, [questionnaires]);

  const saveCustomQuestionnaire = useCallback(async (questionnaire: Questionnaire) => {
    const normalized = normalizeQuestionnaire(questionnaire);
    await dataAdapter.saveCustomQuestionnaire(normalized);
    await loadQuestionnaires({ showSpinner: false, source: 'manual' });
    return normalized;
  }, [loadQuestionnaires]);

  const deleteCustomQuestionnaire = useCallback(async (qualityId: string) => {
    await dataAdapter.deleteCustomQuestionnaire(qualityId);
    await loadQuestionnaires({ showSpinner: false, source: 'manual' });
  }, [loadQuestionnaires]);

  const refresh = useCallback(async () => {
    await loadQuestionnaires({
      showSpinner: true,
      source: 'manual',
    });
  }, [loadQuestionnaires]);

  return {
    questionnaires,
    loading,
    serverStatus,
    getQuestionnaireById,
    refresh,
    retryLoad: refresh,
    saveCustomQuestionnaire,
    deleteCustomQuestionnaire,
  };
}
