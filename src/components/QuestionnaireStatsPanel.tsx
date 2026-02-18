import { useMemo } from 'react';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { t } from '../utils/i18n';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';
import { getDefaultGradingSystem, getGradingMeaning } from '../utils/gradingSystem';

interface QuestionnaireStatsPanelProps {
  results: QuizResult[];
  questionnaires: Questionnaire[];
  questionnaireId: string;
  questionnaireTitle: string;
}

interface QuestionMetric {
  questionId: string;
  questionText: string;
  sortOrder: number;
  attempts: number;
  averageScore: number;
  lastScore: number | null;
  delta: number | null;
  history: Array<{
    score: number;
    completedAt: number;
  }>;
}

function getLocalizedQuestionText(question: Questionnaire['questions'][number]): string {
  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';

  if (typeof question.question === 'string') {
    return question.question;
  }

  return question.question[language] || question.question.en || question.question.ru || question.id;
}

function formatDelta(delta: number | null): string {
  if (delta === null) {
    return '—';
  }
  return delta > 0 ? `+${delta}` : String(delta);
}

export function QuestionnaireStatsPanel({
  results,
  questionnaires,
  questionnaireId,
  questionnaireTitle,
}: QuestionnaireStatsPanelProps) {
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'en'
      ? 'en-US'
      : 'ru-RU';

  const metrics = useMemo<QuestionMetric[]>(() => {
    if (!questionnaireId || results.length === 0) {
      return [];
    }

    const filtered = results
      .filter((result) => result.questionnaireId === questionnaireId)
      .sort((a, b) => a.completedAt - b.completedAt);

    if (filtered.length === 0) {
      return [];
    }

    const schema = questionnaires.find(
      (questionnaire) => getQuestionnaireRuntimeId(questionnaire) === questionnaireId
    );

    const questionOrder = new Map<string, number>();
    schema?.questions.forEach((question, index) => {
      questionOrder.set(question.id, index);
    });

    const questionIds = new Set<string>();

    if (schema) {
      for (const question of schema.questions) {
        questionIds.add(question.id);
      }
    }

    for (const result of filtered) {
      for (const questionId of Object.keys(result.answers)) {
        questionIds.add(questionId);
      }
    }

    return Array.from(questionIds)
      .map((questionId) => {
        const history = filtered.flatMap((result) => {
          const score = result.answers[questionId]?.score;
          if (typeof score !== 'number') {
            return [];
          }

          return [
            {
              score,
              completedAt: result.completedAt,
            },
          ];
        });

        if (history.length === 0) {
          return null;
        }

        const averageScore = Number(
          (
            history.reduce((total, point) => total + point.score, 0) / history.length
          ).toFixed(2)
        );
        const lastScore = history[history.length - 1]?.score ?? null;
        const delta =
          history.length > 1 ? history[history.length - 1].score - history[0].score : null;
        const schemaQuestion = schema?.questions.find((question) => question.id === questionId);
        const questionText = schemaQuestion ? getLocalizedQuestionText(schemaQuestion) : questionId;

        return {
          questionId,
          questionText,
          sortOrder: questionOrder.get(questionId) ?? Number.MAX_SAFE_INTEGER,
          attempts: history.length,
          averageScore,
          lastScore,
          delta,
          history,
        };
      })
      .filter((metric): metric is QuestionMetric => metric !== null)
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.questionText.localeCompare(right.questionText, locale);
      });
  }, [locale, questionnaireId, questionnaires, results]);

  const dynamicMetrics = useMemo(
    () => metrics.filter((metric) => metric.history.length > 1),
    [metrics]
  );
  const lowDataMetrics = useMemo(
    () => metrics.filter((metric) => metric.history.length <= 1),
    [metrics]
  );
  const gradingSystem = useMemo(
    () =>
      questionnaires.find(
        (questionnaire) => getQuestionnaireRuntimeId(questionnaire) === questionnaireId
      )?.grading_system || getDefaultGradingSystem(),
    [questionnaireId, questionnaires]
  );

  if (!questionnaireId) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('questionStats.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('questionStats.subtitle')}
        </p>
        {questionnaireTitle && (
          <p className="mt-2 inline-flex items-center rounded-md border border-primary-200 dark:border-primary-700 px-2 py-1 text-xs text-primary-700 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-900/20">
            {questionnaireTitle}
          </p>
        )}
      </div>

      {metrics.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('questionStats.empty')}</p>
      ) : (
        <div className="space-y-4">
          {dynamicMetrics.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('questionStats.dynamics.noData')}</p>
          ) : (
            dynamicMetrics.map((metric) => (
              <article
                key={metric.questionId}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 md:p-4"
              >
                <p className="text-sm md:text-base font-medium text-gray-900 dark:text-white">
                  {metric.questionText}
                </p>

                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-2">
                    <p className="text-gray-500 dark:text-gray-400">{t('questionStats.metric.average')}</p>
                    <p className="font-semibold text-primary-600 dark:text-primary-400">
                      {metric.averageScore.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-2">
                    <p className="text-gray-500 dark:text-gray-400">{t('questionStats.metric.last')}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                      {metric.lastScore === null ? '—' : metric.lastScore}
                    </p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-2">
                    <p className="text-gray-500 dark:text-gray-400">{t('questionStats.metric.attempts')}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{metric.attempts}</p>
                  </div>
                  <div className="rounded-md bg-gray-50 dark:bg-gray-900/50 p-2">
                    <p className="text-gray-500 dark:text-gray-400">{t('questionStats.metric.delta')}</p>
                    <p
                      className={`font-semibold ${
                        metric.delta === null
                          ? 'text-gray-800 dark:text-gray-100'
                          : metric.delta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : metric.delta < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {formatDelta(metric.delta)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('questionStats.dynamics.title')}
                  </p>
                  <QuestionHistorySparkline
                    history={metric.history}
                    scaleMin={gradingSystem.scale_min}
                    scaleMax={gradingSystem.scale_max}
                  />
                  <div className="overflow-x-auto">
                    <div className="flex gap-2 min-w-max pb-1">
                      {metric.history.map((point, index) => (
                        <div
                          key={`${metric.questionId}-${point.completedAt}-${index}`}
                          className="min-w-[140px] rounded-md border border-gray-200 dark:border-gray-700 px-2 py-2 bg-gray-50 dark:bg-gray-900/40"
                        >
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {new Date(point.completedAt).toLocaleDateString(locale)}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {point.score}/{gradingSystem.scale_max}
                          </p>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300">
                            {getGradingMeaning(gradingSystem, point.score)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}

          {lowDataMetrics.length > 0 && (
            <details className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50/70 dark:bg-gray-900/30">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">
                {t('questionStats.lowData.title', { count: lowDataMetrics.length })}
              </summary>
              <div className="mt-2 space-y-1">
                {lowDataMetrics.map((metric) => (
                  <p key={`low-data-${metric.questionId}`} className="text-xs text-gray-600 dark:text-gray-300">
                    {t('questionStats.lowData.item', {
                      question: metric.questionText,
                      attempts: metric.attempts,
                    })}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

interface QuestionHistorySparklineProps {
  history: Array<{
    score: number;
    completedAt: number;
  }>;
  scaleMin: number;
  scaleMax: number;
}

function QuestionHistorySparkline({ history, scaleMin, scaleMax }: QuestionHistorySparklineProps) {
  const width = Math.max(280, history.length * 72);
  const height = 96;
  const padding = 12;
  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;
  const stepX = history.length > 1 ? drawableWidth / (history.length - 1) : 0;

  const points = history.map((point, index) => {
    const x = padding + index * stepX;
    const denominator = scaleMax - scaleMin;
    const normalized =
      denominator > 0 ? (point.score - scaleMin) / denominator : 0;
    const y = padding + (1 - normalized) * drawableHeight;
    return { x, y, score: point.score };
  });

  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[280px] rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
      >
        <line
          x1={padding}
          y1={padding}
          x2={width - padding}
          y2={padding}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={padding + drawableHeight / 2}
          x2={width - padding}
          y2={padding + drawableHeight / 2}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
        />

        <polyline
          points={polylinePoints}
          fill="none"
          stroke="rgb(14 165 233)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((point, index) => (
          <circle key={`spark-point-${index}`} cx={point.x} cy={point.y} r="3.5" fill="rgb(37 99 235)" />
        ))}
      </svg>
    </div>
  );
}
