import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import type { Questionnaire, QuizResult } from '../types/questionnaire';
import { getLanguage, t } from '../utils/i18n';
import { QuestionnaireStatsPanel } from './QuestionnaireStatsPanel';
import { ScoreChart } from './ScoreChart';
import { DateRangePicker } from './ui/DateRangePicker';

interface AnalyticsPanelProps {
  results: QuizResult[];
  questionnaires: Questionnaire[];
  analyticsUsage: number;
}

type AnalyticsPeriodPreset = 'all' | '7d' | '30d' | 'custom';

interface QuestionnaireAnalyticsOption {
  questionnaireId: string;
  title: string;
  lastCompletedAt: number;
}

function toStartOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
}

function toEndOfDayTimestamp(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

function getRangeBounds(range: DateRange | undefined): {
  start: number | null;
  end: number | null;
  invalid: boolean;
} {
  if (!range?.from && !range?.to) {
    return {
      start: null,
      end: null,
      invalid: false,
    };
  }

  const fromDate = range?.from || null;
  const toDate = range?.to || range?.from || null;

  if (!fromDate && !toDate) {
    return {
      start: null,
      end: null,
      invalid: false,
    };
  }

  if (fromDate && toDate && fromDate.getTime() > toDate.getTime()) {
    return {
      start: null,
      end: null,
      invalid: true,
    };
  }

  const fallbackDate = toDate || fromDate;

  return {
    start: fromDate ? toStartOfDayTimestamp(fromDate) : fallbackDate ? toStartOfDayTimestamp(fallbackDate) : null,
    end: toDate ? toEndOfDayTimestamp(toDate) : fallbackDate ? toEndOfDayTimestamp(fallbackDate) : null,
    invalid: false,
  };
}

export function AnalyticsPanel({ results, questionnaires, analyticsUsage }: AnalyticsPanelProps) {
  const language = getLanguage();
  const questionnaireOptions = useMemo<QuestionnaireAnalyticsOption[]>(() => {
    const byId = new Map<string, QuestionnaireAnalyticsOption>();

    for (const result of results) {
      const current = byId.get(result.questionnaireId);
      if (!current || result.completedAt > current.lastCompletedAt) {
        byId.set(result.questionnaireId, {
          questionnaireId: result.questionnaireId,
          title: result.questionnaireTitle || result.questionnaireId,
          lastCompletedAt: result.completedAt,
        });
      }
    }

    return Array.from(byId.values()).sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [results]);

  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<string>(
    questionnaireOptions[0]?.questionnaireId || ''
  );
  const [periodPreset, setPeriodPreset] = useState<AnalyticsPeriodPreset>('all');
  const [periodRange, setPeriodRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (questionnaireOptions.length === 0) {
      setSelectedQuestionnaireId('');
      return;
    }

    if (!questionnaireOptions.some((option) => option.questionnaireId === selectedQuestionnaireId)) {
      setSelectedQuestionnaireId(questionnaireOptions[0].questionnaireId);
    }
  }, [questionnaireOptions, selectedQuestionnaireId]);

  const applyPreset = (nextPreset: 'all' | '7d' | '30d') => {
    setPeriodPreset(nextPreset);

    if (nextPreset === 'all') {
      setPeriodRange(undefined);
      return;
    }

    const daysBack = nextPreset === '7d' ? 6 : 29;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);

    setPeriodRange({
      from: startDate,
      to: endDate,
    });
  };

  const rangeBounds = useMemo(() => getRangeBounds(periodRange), [periodRange]);
  const periodStartTimestamp = rangeBounds.start;
  const periodEndTimestamp = rangeBounds.end;
  const invalidRange = rangeBounds.invalid;

  const filteredResults = useMemo(() => {
    if (!selectedQuestionnaireId || invalidRange) {
      return [];
    }

    return results.filter((result) => {
      if (result.questionnaireId !== selectedQuestionnaireId) {
        return false;
      }

      if (periodStartTimestamp !== null && result.completedAt < periodStartTimestamp) {
        return false;
      }

      if (periodEndTimestamp !== null && result.completedAt > periodEndTimestamp) {
        return false;
      }

      return true;
    });
  }, [invalidRange, periodEndTimestamp, periodStartTimestamp, results, selectedQuestionnaireId]);

  const selectedQuestionnaireTitle =
    questionnaireOptions.find((option) => option.questionnaireId === selectedQuestionnaireId)?.title ||
    selectedQuestionnaireId;

  const presetButtonClass = (preset: 'all' | '7d' | '30d'): string =>
    `px-3 py-2 rounded-md text-sm border transition-colors ${
      periodPreset === preset
        ? 'bg-primary-600 border-primary-600 text-white'
        : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'
    }`;

  return (
    <section className="space-y-4">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-1">
          {t('dashboard.analytics.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('dashboard.analytics.subtitle')}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {t('dashboard.analytics.usage', { count: analyticsUsage })}
        </p>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.analytics.filter.questionnaire')}
            </span>
            <select
              value={selectedQuestionnaireId}
              onChange={(event) => setSelectedQuestionnaireId(event.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200"
              aria-label={t('questionStats.select')}
            >
              {questionnaireOptions.map((option) => (
                <option key={option.questionnaireId} value={option.questionnaireId}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.analytics.filter.period')}
            </span>
            <DateRangePicker
              value={periodRange}
              language={language}
              onChange={(nextRange) => {
                setPeriodPreset('custom');
                setPeriodRange(nextRange);
              }}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('dashboard.analytics.filter.quickPeriod')}
            </span>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => applyPreset('7d')} className={presetButtonClass('7d')}>
                {t('dashboard.analytics.filter.quick7')}
              </button>
              <button type="button" onClick={() => applyPreset('30d')} className={presetButtonClass('30d')}>
                {t('dashboard.analytics.filter.quick30')}
              </button>
              <button type="button" onClick={() => applyPreset('all')} className={presetButtonClass('all')}>
                {t('dashboard.analytics.filter.quickAll')}
              </button>
            </div>
          </div>
        </div>

        {invalidRange && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t('dashboard.analytics.rangeInvalid')}
          </p>
        )}
      </section>

      {!invalidRange && filteredResults.length === 0 ? (
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('dashboard.analytics.emptyByFilter')}
          </p>
        </section>
      ) : (
        <>
          <ScoreChart results={filteredResults} />
          <QuestionnaireStatsPanel
            results={filteredResults}
            questionnaires={questionnaires}
            questionnaireId={selectedQuestionnaireId}
            questionnaireTitle={selectedQuestionnaireTitle}
          />
        </>
      )}
    </section>
  );
}
