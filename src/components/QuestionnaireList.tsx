import { useEffect, useMemo, useState } from 'react';
import type { Questionnaire } from '../types/questionnaire';
import { t } from '../utils/i18n';
import {
  getQuestionnaireRuntimeId,
  isLocalQuestionnaire,
} from '../utils/questionnaireIdentity';
import type { QuestionnaireLoadStatus } from '../hooks/useQuestionnaires';

interface QuestionnaireListProps {
  questionnaires: Questionnaire[];
  loading: boolean;
  serverStatus?: QuestionnaireLoadStatus;
  pausedQuestionnaireIds?: ReadonlySet<string>;
  onRetryLoad?: () => void;
  onSelect: (questionnaire: Questionnaire) => void;
}

export function QuestionnaireList({
  questionnaires,
  loading,
  serverStatus,
  pausedQuestionnaireIds,
  onRetryLoad,
  onSelect,
}: QuestionnaireListProps) {
  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';
  const localLabel = language === 'en' ? 'local' : 'локальный';
  const [now, setNow] = useState(() => Date.now());

  const getTitle = (q: Questionnaire) => {
    const lang = document.documentElement.lang as string;
    const title = q.metadata.title;
    if (typeof title === 'string') return title;
    return title[lang] || title['en'] || title['ru'] || '';
  };

  useEffect(() => {
    if (!serverStatus?.nextRetryAt || typeof window === 'undefined') {
      return;
    }
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, [serverStatus?.nextRetryAt]);

  const autoRetryInSeconds = useMemo(() => {
    if (!serverStatus?.nextRetryAt) {
      return null;
    }
    return Math.max(0, Math.ceil((serverStatus.nextRetryAt - now) / 1000));
  }, [now, serverStatus?.nextRetryAt]);

  const staticQuestionnaires = questionnaires.filter((questionnaire) => !isLocalQuestionnaire(questionnaire));
  const localQuestionnaires = questionnaires.filter((questionnaire) => isLocalQuestionnaire(questionnaire));

  if (loading) {
    const loadingLabel =
      serverStatus?.state === 'retrying'
        ? t('quiz.loading.retrying', {
            attempt: serverStatus.attempt,
            max: serverStatus.maxAttempts,
          })
        : t('quiz.loading.title');

    return (
      <div className="flex flex-col justify-center items-center gap-3 h-64 text-center px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-sm text-gray-600 dark:text-gray-300">{loadingLabel}</p>
        {serverStatus?.state === 'retrying' && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('quiz.loading.retryingHint')}
          </p>
        )}
      </div>
    );
  }

  if (questionnaires.length === 0 && serverStatus?.state === 'error') {
    return (
      <div className="text-center py-12 border border-red-200 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-900/10 px-4">
        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
          {t('quiz.loading.failedTitle')}
        </p>
        <p className="mt-2 text-sm text-red-700 dark:text-red-400">
          {t('quiz.loading.failedDescription')}
        </p>
        {autoRetryInSeconds !== null && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-500">
            {t('quiz.loading.autoRetry', { seconds: autoRetryInSeconds })}
          </p>
        )}
        {onRetryLoad && (
          <button
            type="button"
            onClick={onRetryLoad}
            className="mt-4 inline-flex items-center px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm text-white transition-colors"
          >
            {t('quiz.loading.retryButton')}
          </button>
        )}
      </div>
    );
  }

  if (questionnaires.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          {t('quiz.noQuizzes')}
        </p>
      </div>
    );
  }

  const renderCards = (items: Questionnaire[], isLocalBlock: boolean) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((questionnaire) => {
          const runtimeId = getQuestionnaireRuntimeId(questionnaire);
          const isPaused = Boolean(pausedQuestionnaireIds?.has(runtimeId));

          return (
            <div
              key={runtimeId}
              data-questionnaire-id={runtimeId}
              data-paused={isPaused ? 'true' : 'false'}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getTitle(questionnaire)}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isPaused && (
                      <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap">
                        {t('quiz.paused.continue')}
                      </span>
                    )}
                    {isLocalBlock && (
                      <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 whitespace-nowrap">
                        {localLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span>{questionnaire.questions.length} {t('quiz.questions')}</span>
                  <span>{t('quiz.scale')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onSelect(questionnaire)}
                  data-testid={`questionnaire-select-${runtimeId}`}
                  className={
                    isPaused
                      ? 'w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors'
                      : 'w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors'
                  }
                >
                  {isPaused ? t('quiz.paused.continue') : t('quiz.start')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {serverStatus?.state === 'degraded' && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
            {t('quiz.loading.partialTitle')}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
            {t('quiz.loading.partialDescription')}
          </p>
          <div className="mt-2 flex items-center gap-3">
            {autoRetryInSeconds !== null && (
              <p className="text-xs text-amber-700 dark:text-amber-500">
                {t('quiz.loading.autoRetry', { seconds: autoRetryInSeconds })}
              </p>
            )}
            {onRetryLoad && (
              <button
                type="button"
                onClick={onRetryLoad}
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs text-white transition-colors"
              >
                {t('quiz.loading.retryButton')}
              </button>
            )}
          </div>
        </div>
      )}

      {renderCards(staticQuestionnaires, false)}

      {localQuestionnaires.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {language === 'en' ? 'Local questionnaires' : 'Локальные опросники'}
          </p>
          {renderCards(localQuestionnaires, true)}
        </section>
      )}
    </div>
  );
}
