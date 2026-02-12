import type { Questionnaire } from '../types/questionnaire';
import { t } from '../utils/i18n';
import {
  getQuestionnaireRuntimeId,
  isLocalQuestionnaire,
} from '../utils/questionnaireIdentity';

interface QuestionnaireListProps {
  questionnaires: Questionnaire[];
  loading: boolean;
  pausedQuestionnaireIds?: ReadonlySet<string>;
  onSelect: (questionnaire: Questionnaire) => void;
}

export function QuestionnaireList({
  questionnaires,
  loading,
  pausedQuestionnaireIds,
  onSelect,
}: QuestionnaireListProps) {
  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';
  const localLabel = language === 'en' ? 'local' : 'локальный';

  const getTitle = (q: Questionnaire) => {
    const lang = document.documentElement.lang as string;
    const title = q.metadata.title;
    if (typeof title === 'string') return title;
    return title[lang] || title['en'] || title['ru'] || '';
  };

  const staticQuestionnaires = questionnaires.filter((questionnaire) => !isLocalQuestionnaire(questionnaire));
  const localQuestionnaires = questionnaires.filter((questionnaire) => isLocalQuestionnaire(questionnaire));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
