import { useEffect, useMemo, useState } from 'react';
import type { QuizResult } from '../types/questionnaire';
import { getGradeDescription, t } from '../utils/i18n';

interface ScoreChartProps {
  results: QuizResult[];
}

interface DailyScoreMetric {
  dateKey: string;
  monthKey: string;
  day: number;
  timestamp: number;
  averageScore: number;
  attempts: number;
  answersCount: number;
}

function toDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } | null {
  const parts = monthKey.split('-');
  if (parts.length !== 2) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    year,
    monthIndex: month - 1,
  };
}

function toScoreHue(score: number): number {
  const clamped = Math.max(0, Math.min(10, score));
  return Math.round((clamped / 10) * 120);
}

function getScoreColor(score: number): string {
  return `hsl(${toScoreHue(score)} 70% 42%)`;
}

function getScoreBackground(score: number): string {
  return `hsla(${toScoreHue(score)} 70% 42% / 0.15)`;
}

function getMonthLabel(monthKey: string, locale: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  const date = new Date(parsed.year, parsed.monthIndex, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function ScoreChart({ results }: ScoreChartProps) {
  const locale =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru-RU' : 'ru-RU';
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const startSunday = new Date(Date.UTC(2026, 0, 4)); // Sunday
    return Array.from({ length: 7 }).map((_, index) =>
      formatter.format(new Date(startSunday.getTime() + index * 24 * 60 * 60 * 1000))
    );
  }, [locale]);
  const distribution = useMemo(() => {
    const dist = new Array(11).fill(0).map((_, score) => ({ score, count: 0 }));

    for (const result of results) {
      for (const answer of Object.values(result.answers)) {
        if (answer.score >= 0 && answer.score <= 10) {
          dist[answer.score].count += 1;
        }
      }
    }

    return dist;
  }, [results]);

  const dailyMetrics = useMemo<DailyScoreMetric[]>(() => {
    const map = new Map<string, { sum: number; count: number; attempts: number; timestamp: number }>();

    for (const result of results) {
      const dateKey = toDateKey(result.completedAt);
      const existing = map.get(dateKey) || {
        sum: 0,
        count: 0,
        attempts: 0,
        timestamp: new Date(
          new Date(result.completedAt).getFullYear(),
          new Date(result.completedAt).getMonth(),
          new Date(result.completedAt).getDate()
        ).getTime(),
      };

      existing.attempts += 1;

      for (const answer of Object.values(result.answers)) {
        if (answer.score >= 0 && answer.score <= 10) {
          existing.sum += answer.score;
          existing.count += 1;
        }
      }

      map.set(dateKey, existing);
    }

    return Array.from(map.entries())
      .map(([dateKey, payload]) => {
        const averageScore =
          payload.count > 0 ? Number((payload.sum / payload.count).toFixed(2)) : 0;
        const [year, month, day] = dateKey.split('-').map((entry) => Number(entry));
        return {
          dateKey,
          monthKey: toMonthKey(payload.timestamp),
          day: Number.isFinite(day) ? day : 1,
          timestamp: new Date(year, (month || 1) - 1, day || 1).getTime(),
          averageScore,
          attempts: payload.attempts,
          answersCount: payload.count,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [results]);

  const monthKeys = useMemo(
    () => Array.from(new Set(dailyMetrics.map((metric) => metric.monthKey))).sort(),
    [dailyMetrics]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');

  useEffect(() => {
    if (monthKeys.length === 0) {
      setSelectedMonth('');
      return;
    }

    if (!monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[monthKeys.length - 1]);
    }
  }, [monthKeys, selectedMonth]);

  const selectedMonthMetrics = useMemo(
    () => dailyMetrics.filter((metric) => metric.monthKey === selectedMonth),
    [dailyMetrics, selectedMonth]
  );

  useEffect(() => {
    if (selectedMonthMetrics.length === 0) {
      setSelectedDateKey('');
      return;
    }

    const hasCurrent = selectedMonthMetrics.some((metric) => metric.dateKey === selectedDateKey);
    if (!hasCurrent) {
      setSelectedDateKey(selectedMonthMetrics[selectedMonthMetrics.length - 1].dateKey);
    }
  }, [selectedDateKey, selectedMonthMetrics]);

  const selectedDateMetric = useMemo(
    () => selectedMonthMetrics.find((metric) => metric.dateKey === selectedDateKey) || null,
    [selectedDateKey, selectedMonthMetrics]
  );

  const selectedMonthParsed = useMemo(() => parseMonthKey(selectedMonth), [selectedMonth]);
  const calendarMeta = useMemo(() => {
    if (!selectedMonthParsed) {
      return {
        leadingEmptyCells: 0,
        totalDays: 0,
        byDay: new Map<number, DailyScoreMetric>(),
      };
    }

    const byDay = new Map<number, DailyScoreMetric>();
    for (const metric of selectedMonthMetrics) {
      byDay.set(metric.day, metric);
    }

    return {
      leadingEmptyCells: new Date(
        selectedMonthParsed.year,
        selectedMonthParsed.monthIndex,
        1
      ).getDay(),
      totalDays: new Date(
        selectedMonthParsed.year,
        selectedMonthParsed.monthIndex + 1,
        0
      ).getDate(),
      byDay,
    };
  }, [selectedMonthMetrics, selectedMonthParsed]);

  const selectedMonthIndex = monthKeys.indexOf(selectedMonth);
  const canGoPrevMonth = selectedMonthIndex > 0;
  const canGoNextMonth =
    selectedMonthIndex !== -1 && selectedMonthIndex < monthKeys.length - 1;
  const maxDistributionCount = Math.max(...distribution.map((item) => item.count), 1);

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {t('chart.distribution.title')}
        </h3>
        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('chart.distribution.subtitle')}
        </p>

        <div className="space-y-2">
          {distribution.map(({ score, count }) => {
            const width = maxDistributionCount > 0 ? (count / maxDistributionCount) * 100 : 0;
            return (
              <div key={score} className="grid grid-cols-[2.5rem_1fr_2.5rem] md:grid-cols-[2.5rem_1fr_3rem_22rem] gap-2 md:gap-3 items-center">
                <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  {score}
                </span>

                <div className="h-4 md:h-5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${width}%`, backgroundColor: getScoreColor(score) }}
                  />
                </div>

                <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{count}</span>

                <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 truncate">
                  {getGradeDescription(score)}
                </span>
              </div>
            );
          })}
        </div>
      </article>

      <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              {t('chart.timeline.title')}
            </h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {t('chart.timeline.subtitle')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('chart.timeline.hint')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              onClick={() => {
                if (canGoPrevMonth) {
                  setSelectedMonth(monthKeys[selectedMonthIndex - 1]);
                }
              }}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              ←
            </button>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[11rem] text-center capitalize">
              {selectedMonth ? getMonthLabel(selectedMonth, locale) : '—'}
            </span>
            <button
              type="button"
              disabled={!canGoNextMonth}
              onClick={() => {
                if (canGoNextMonth) {
                  setSelectedMonth(monthKeys[selectedMonthIndex + 1]);
                }
              }}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>

        {selectedMonthMetrics.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('chart.timeline.empty')}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
              {weekdayLabels.map((label, index) => (
                <div
                  key={`weekday-${index}`}
                  className="text-[10px] md:text-xs text-center text-gray-500 dark:text-gray-400"
                >
                  {label}
                </div>
              ))}

              {Array.from({ length: calendarMeta.leadingEmptyCells }).map((_, index) => (
                <div key={`empty-${index}`} className="h-14 md:h-16 rounded-md bg-transparent" />
              ))}

              {Array.from({ length: calendarMeta.totalDays }).map((_, index) => {
                const day = index + 1;
                const metric = calendarMeta.byDay.get(day);
                const isSelected = metric?.dateKey === selectedDateKey;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    disabled={!metric}
                    onClick={() => {
                      if (metric) {
                        setSelectedDateKey(metric.dateKey);
                      }
                    }}
                    className={`h-14 md:h-16 rounded-md border p-1 text-left transition-colors ${
                      metric
                        ? 'border-gray-300 dark:border-gray-600'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 cursor-default'
                    } ${
                      isSelected
                        ? 'ring-2 ring-primary-500 border-primary-400'
                        : ''
                    }`}
                    style={metric ? { backgroundColor: getScoreBackground(metric.averageScore) } : undefined}
                    title={
                      metric
                        ? `${metric.dateKey}: ${metric.averageScore}/10 • ${getGradeDescription(
                            Math.round(metric.averageScore)
                          )}`
                        : `${selectedMonth}-${String(day).padStart(2, '0')}`
                    }
                  >
                    <p className="text-[11px] md:text-xs font-medium text-gray-800 dark:text-gray-100">
                      {day}
                    </p>
                    {metric && (
                      <p className="text-[10px] md:text-xs text-gray-700 dark:text-gray-200">
                        {metric.averageScore.toFixed(1)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDateMetric && (
              <div className="mt-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  {t('chart.timeline.summary', {
                    date: selectedDateMetric.dateKey,
                    score: selectedDateMetric.averageScore.toFixed(2),
                    grade: getGradeDescription(Math.round(selectedDateMetric.averageScore)),
                    attempts: selectedDateMetric.attempts,
                    answersCount: selectedDateMetric.answersCount,
                  })}
                </p>
              </div>
            )}
          </>
        )}
      </article>
    </section>
  );
}
