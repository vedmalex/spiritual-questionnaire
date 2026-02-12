import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { CuratorFeedback, Questionnaire, QuizResult } from '../types/questionnaire';
import { t, getGradeDescription, getLanguage } from '../utils/i18n';
import type { ExportFormat } from '../utils/exportUtils';
import { trackFormActivity } from '../utils/analytics';
import { dataAdapter } from '../services/localStorageAdapter';
import { AnalyticsPanel } from './AnalyticsPanel';
import type { ImportStrategy, ImportSummary } from '../utils/resultsTransfer';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';
import {
  buildResultReportBundle,
  downloadPlainTextReport,
  downloadTextReport,
  printReportHtml,
  type ResultReportBundle,
} from '../utils/reportBuilder';

interface DashboardProps {
  results: QuizResult[];
  questionnaires: Questionnaire[];
  loading: boolean;
  onExportResult: (result: QuizResult, format: ExportFormat) => void;
  onExportAll: (format: ExportFormat) => void;
  onImportAll: (file: File, strategy: ImportStrategy) => Promise<ImportSummary>;
  onDeleteResult: (resultId: string) => void;
  onUpdateResult: (result: QuizResult) => Promise<void>;
  currentUserName?: string;
  activeTab?: 'results' | 'analytics' | 'feedback';
  onTabChange?: (tab: 'results' | 'analytics' | 'feedback') => void;
  focusResultId?: string;
  focusResultCompletedAt?: number;
  focusQuestionId?: string;
}

interface ExpandedResult {
  resultId: string;
  questionId: string;
}

interface QuestionnaireResultGroup {
  questionnaireId: string;
  questionnaireTitle: string;
  attempts: number;
  overallPercentage: number;
  overallScoreTen: number;
  overallScoreLabel: string;
  lastCompletedAt: number;
  results: QuizResult[];
}

interface FeedbackQuestionThread {
  questionId: string;
  questionIndex: number;
  questionTitle: string;
  score: number;
  answerComment: string;
  messages: CuratorFeedback[];
}

interface FeedbackResultThread {
  result: QuizResult;
  questions: FeedbackQuestionThread[];
}

interface OpenResultForEditOptions {
  questionId?: string;
  questionIndex?: number;
  requireAnsweredQuestion?: boolean;
}

function getLocalizedQuestionText(
  question: Questionnaire['questions'][number],
  language: 'ru' | 'en'
): string {
  if (typeof question.question === 'string') {
    return question.question;
  }

  return question.question[language] || question.question.en || question.question.ru || question.id;
}

function cloneResultAnswers(result: QuizResult): QuizResult['answers'] {
  return Object.fromEntries(
    Object.entries(result.answers).map(([questionId, answer]) => [
      questionId,
      {
        score: answer.score,
        comment: answer.comment || '',
        photos: [...(answer.photos || [])],
        curatorFeedback: (answer.curatorFeedback || []).map((entry) => ({ ...entry })),
      },
    ])
  );
}

function buildResultAnchorId(resultId: string, completedAt: number): string {
  return `dashboard-result-${encodeURIComponent(resultId)}-${completedAt}`;
}

function buildQuestionAnchorId(resultId: string, completedAt: number, questionId: string): string {
  return `dashboard-question-${encodeURIComponent(resultId)}-${completedAt}-${encodeURIComponent(questionId)}`;
}

export function Dashboard({
  results,
  questionnaires,
  loading,
  onExportResult,
  onExportAll,
  onImportAll,
  onDeleteResult,
  onUpdateResult,
  currentUserName,
  activeTab = 'results',
  onTabChange,
  focusResultId,
  focusResultCompletedAt,
  focusQuestionId,
}: DashboardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<ExpandedResult | null>(null);
  const [analyticsUsage, setAnalyticsUsage] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0;
    }

    const raw = Number(window.localStorage.getItem('spiritual_questionnaire_dashboard_analytics_views'));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
  });
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [savingFeedbackKey, setSavingFeedbackKey] = useState<string | null>(null);
  const [reportBundle, setReportBundle] = useState<ResultReportBundle | null>(null);
  const [reportResultId, setReportResultId] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportError, setReportError] = useState('');
  const [highlightedFocus, setHighlightedFocus] = useState<{
    resultId: string;
    resultCompletedAt?: number;
    questionId?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusAppliedKeyRef = useRef<string>('');
  const highlightTimeoutRef = useRef<number | null>(null);
  const exportFormat: ExportFormat = 'json';
  const importStrategy: ImportStrategy = 'replace';

  const hasResults = results.length > 0;

  useEffect(() => {
    if (activeTab !== 'analytics' || typeof window === 'undefined') {
      return;
    }

    const raw = Number(window.localStorage.getItem('spiritual_questionnaire_dashboard_analytics_views'));
    const current = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    const next = current + 1;
    window.localStorage.setItem('spiritual_questionnaire_dashboard_analytics_views', String(next));
    setAnalyticsUsage(next);
    trackFormActivity('dashboard_tab', 'open_analytics', {
      views: next,
    });
  }, [activeTab]);

  const groupedResults = useMemo<QuestionnaireResultGroup[]>(() => {
    const byQuestionnaire = new Map<string, QuizResult[]>();

    for (const result of results) {
      const key = result.questionnaireId;
      const current = byQuestionnaire.get(key) || [];
      current.push(result);
      byQuestionnaire.set(key, current);
    }

    const groups = Array.from(byQuestionnaire.entries()).map(([questionnaireId, items]) => {
      const sortedItems = items.slice().sort((a, b) => b.completedAt - a.completedAt);
      const questionnaireTitle = sortedItems[0]?.questionnaireTitle || questionnaireId;
      const attempts = sortedItems.length;
      const totalScore = sortedItems.reduce((sum, item) => sum + item.totalScore, 0);
      const maxPossible = sortedItems.reduce((sum, item) => sum + item.maxPossibleScore, 0);
      const overallPercentage =
        maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
      const overallScoreTen = Number((overallPercentage / 10).toFixed(1));
      const overallScoreLabel = getGradeDescription(
        Math.max(0, Math.min(10, Math.round(overallScoreTen)))
      );

      return {
        questionnaireId,
        questionnaireTitle,
        attempts,
        overallPercentage,
        overallScoreTen,
        overallScoreLabel,
        lastCompletedAt: sortedItems[0]?.completedAt || 0,
        results: sortedItems,
      };
    });

    return groups.sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [results]);

  const language = getLanguage();

  const questionLookup = useMemo(() => {
    const next = new Map<string, Map<string, { index: number; title: string }>>();

    for (const questionnaire of questionnaires) {
      const byId = new Map<string, { index: number; title: string }>();
      questionnaire.questions.forEach((question, index) => {
        byId.set(question.id, {
          index,
          title: getLocalizedQuestionText(question, language),
        });
      });
      next.set(getQuestionnaireRuntimeId(questionnaire), byId);
    }

    return next;
  }, [language, questionnaires]);

  const feedbackThreads = useMemo<FeedbackResultThread[]>(() => {
    return results
      .map((result) => {
        const schemaLookup = questionLookup.get(result.questionnaireId);
        const questions = Object.entries(result.answers).flatMap(([questionId, answer], fallbackIndex) => {
          const messages = (answer.curatorFeedback || [])
            .filter((entry) => String(entry.comment || '').trim().length > 0)
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp);

          if (messages.length === 0) {
            return [];
          }

          const schemaQuestion = schemaLookup?.get(questionId);
          const questionIndex = schemaQuestion?.index ?? fallbackIndex;
          const questionTitle = schemaQuestion?.title || questionId;

          return [
            {
              questionId,
              questionIndex,
              questionTitle,
              score: answer.score,
              answerComment: answer.comment || '',
              messages,
            },
          ];
        });

        questions.sort((a, b) => a.questionIndex - b.questionIndex);

        return {
          result,
          questions,
        };
      })
      .filter((entry) => entry.questions.length > 0)
      .sort((a, b) => b.result.completedAt - a.result.completedAt);
  }, [questionLookup, results]);

  const focusedResult = useMemo(() => {
    if (!focusResultId) return null;

    if (focusResultCompletedAt !== undefined) {
      const strict = results.find(
        (result) =>
          result.id === focusResultId &&
          result.completedAt === focusResultCompletedAt
      );
      return strict || null;
    }

    return results.find((result) => result.id === focusResultId) || null;
  }, [focusResultCompletedAt, focusResultId, results]);

  useEffect(() => {
    if (!focusedResult || !results.length) return;
    const resolvedFocusResultId = focusedResult.id;
    const resolvedFocusResultCompletedAt = focusedResult.completedAt;

    const focusKey = `${activeTab}:${resolvedFocusResultId}:${resolvedFocusResultCompletedAt}:${focusQuestionId || ''}:${results.length}`;
    if (focusAppliedKeyRef.current === focusKey) {
      return;
    }

    if (activeTab === 'results' && focusQuestionId) {
      setExpanded({ resultId: resolvedFocusResultId, questionId: focusQuestionId });
    }
    setHighlightedFocus({
      resultId: resolvedFocusResultId,
      resultCompletedAt: resolvedFocusResultCompletedAt,
      questionId: focusQuestionId,
    });
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    let cancelled = false;
    let retries = 0;
    let timeoutId: number | null = null;
    let cleanupUrlTimeoutId: number | null = null;

    const tryScroll = () => {
      if (cancelled) return;

      const questionTarget = focusQuestionId
        ? document.getElementById(
            buildQuestionAnchorId(
              resolvedFocusResultId,
              resolvedFocusResultCompletedAt,
              focusQuestionId
            )
          )
        : null;
      const resultTarget = document.getElementById(
        buildResultAnchorId(resolvedFocusResultId, resolvedFocusResultCompletedAt)
      );
      const target = questionTarget || resultTarget;

      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusAppliedKeyRef.current = focusKey;
        cleanupUrlTimeoutId = window.setTimeout(() => {
          if (cancelled) return;
          void navigate({
            to: '/dashboard',
            replace: true,
            resetScroll: false,
            search: (prev: Record<string, unknown>) => ({
              ...prev,
              focusResultId: undefined,
              focusResultAt: undefined,
              focusQuestionId: undefined,
            }),
          });
        }, 350);
        return;
      }

      retries += 1;
      if (retries >= 20) {
        focusAppliedKeyRef.current = focusKey;
        return;
      }

      timeoutId = window.setTimeout(tryScroll, 80);
    };

    timeoutId = window.setTimeout(tryScroll, 0);
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedFocus(null);
      highlightTimeoutRef.current = null;
    }, 8000);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      if (cleanupUrlTimeoutId !== null) {
        window.clearTimeout(cleanupUrlTimeoutId);
      }
    };
  }, [activeTab, focusQuestionId, focusedResult, navigate, results.length]);

  const isResultHighlighted = (result: QuizResult): boolean =>
    highlightedFocus?.resultId === result.id &&
    (highlightedFocus?.resultCompletedAt === undefined ||
      highlightedFocus?.resultCompletedAt === result.completedAt);

  const isQuestionHighlighted = (result: QuizResult, questionId: string): boolean =>
    isResultHighlighted(result) && highlightedFocus?.questionId === questionId;

  const toggleQuestionDetails = (resultId: string, questionId: string) => {
    if (expanded?.resultId === resultId && expanded?.questionId === questionId) {
      setExpanded(null);
    } else {
      setExpanded({ resultId, questionId });
    }
  };

  const feedbackKey = (resultId: string, questionId: string): string => `${resultId}::${questionId}`;

  const updateFeedbackDraft = (resultId: string, questionId: string, value: string) => {
    const key = feedbackKey(resultId, questionId);
    setReplyDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const updateCommentDraft = (resultId: string, questionId: string, value: string) => {
    const key = feedbackKey(resultId, questionId);
    setCommentDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveStudentReply = async (result: QuizResult, questionId: string) => {
    const key = feedbackKey(result.id, questionId);
    const reply = (replyDrafts[key] || '').trim();
    if (!reply) return;

    const answer = result.answers[questionId];
    if (!answer) return;

    const fallbackStudentName = currentUserName?.trim() || t('dashboard.feedback.author.student');
    const newEntry: CuratorFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      curatorName: fallbackStudentName,
      questionId,
      comment: reply,
      timestamp: Date.now(),
      authorRole: 'student',
      authorName: fallbackStudentName,
    };

    const updatedResult: QuizResult = {
      ...result,
      answers: {
        ...result.answers,
        [questionId]: {
          ...answer,
          curatorFeedback: [...(answer.curatorFeedback || []), newEntry],
        },
      },
    };

    setFeedbackError('');
    setFeedbackMessage('');
    setSavingFeedbackKey(key);
    try {
      await onUpdateResult(updatedResult);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFeedbackMessage(t('dashboard.feedback.saved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('dashboard.import.error');
      setFeedbackError(message);
    } finally {
      setSavingFeedbackKey((prev) => (prev === key ? null : prev));
    }
  };

  const handleSaveAnswerComment = async (result: QuizResult, questionId: string) => {
    const key = feedbackKey(result.id, questionId);
    const answer = result.answers[questionId];
    if (!answer) return;

    const draft = commentDrafts[key];
    const nextComment = (draft ?? answer.comment ?? '').trim();
    const prevComment = (answer.comment || '').trim();
    if (nextComment === prevComment) return;

    const updatedResult: QuizResult = {
      ...result,
      answers: {
        ...result.answers,
        [questionId]: {
          ...answer,
          comment: nextComment,
        },
      },
    };

    setFeedbackError('');
    setFeedbackMessage('');
    setSavingFeedbackKey(key);
    try {
      await onUpdateResult(updatedResult);
      setCommentDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFeedbackMessage(t('dashboard.feedback.saved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('dashboard.import.error');
      setFeedbackError(message);
    } finally {
      setSavingFeedbackKey((prev) => (prev === key ? null : prev));
    }
  };

  const openResultForEdit = async (
    result: QuizResult,
    options?: OpenResultForEditOptions
  ) => {
    const questionnaire = questionnaires.find(
      (item) => getQuestionnaireRuntimeId(item) === result.questionnaireId
    );

    if (!questionnaire) {
      setFeedbackError(t('dashboard.group.openQuestionnaire.errorSchema'));
      return;
    }

    if (questionnaire.questions.length === 0) {
      setFeedbackError(t('dashboard.group.openQuestionnaire.errorSchema'));
      return;
    }

    let targetQuestionIndex = options?.questionIndex;
    let targetQuestionId = options?.questionId;

    if (targetQuestionId) {
      const schemaIndex = questionnaire.questions.findIndex(
        (question) => question.id === targetQuestionId
      );
      if (schemaIndex >= 0) {
        targetQuestionIndex = schemaIndex;
      }
    }

    if (
      options?.requireAnsweredQuestion &&
      (!targetQuestionId || !result.answers[targetQuestionId])
    ) {
      setFeedbackError(t('dashboard.feedback.openQuestion.errorQuestion'));
      return;
    }

    if (
      targetQuestionIndex === undefined ||
      targetQuestionIndex < 0 ||
      targetQuestionIndex >= questionnaire.questions.length
    ) {
      const firstAnsweredIndex = questionnaire.questions.findIndex(
        (question) => !!result.answers[question.id]
      );
      targetQuestionIndex = firstAnsweredIndex >= 0 ? firstAnsweredIndex : 0;
      targetQuestionId = questionnaire.questions[targetQuestionIndex]?.id;
    }

    if (
      options?.requireAnsweredQuestion &&
      targetQuestionId &&
      !result.answers[targetQuestionId]
    ) {
      setFeedbackError(t('dashboard.feedback.openQuestion.errorQuestion'));
      return;
    }

    const safeQuestionIndex = Math.max(
      0,
      Math.min(targetQuestionIndex, Math.max(questionnaire.questions.length - 1, 0))
    );
    const focusParams = new URLSearchParams();
    focusParams.set('tab', activeTab);
    focusParams.set('focusResultId', result.id);
    focusParams.set('focusResultAt', String(result.completedAt));
    if (options?.questionId) {
      focusParams.set('focusQuestionId', options.questionId);
    }
    const returnUrl = `/dashboard?${focusParams.toString()}`;

    await dataAdapter.saveSession({
      id: `session_${Date.now()}`,
      sourceResultId: result.id,
      sourceResultCompletedAt: result.completedAt,
      questionnaireId: getQuestionnaireRuntimeId(questionnaire),
      userName: result.userName,
      userRole: 'student',
      returnUrl,
      startTime: Date.now(),
      lastActivity: Date.now(),
      currentQuestionIndex: safeQuestionIndex,
      answers: cloneResultAnswers(result),
      status: 'active',
    });

    setFeedbackError('');
    setFeedbackMessage('');
    trackFormActivity('dashboard', 'open_result_for_edit', {
      questionnaire: result.questionnaireId,
      question: targetQuestionId || `question_${safeQuestionIndex + 1}`,
    });
    await navigate({
      to: '/',
      search: () => ({
        quiz: getQuestionnaireRuntimeId(questionnaire),
        q: safeQuestionIndex,
        returnUrl,
      }),
    });
  };

  const handleOpenQuestionForEdit = async (
    result: QuizResult,
    questionId: string,
    questionIndex: number
  ) => {
    await openResultForEdit(result, {
      questionId,
      questionIndex,
      requireAnsweredQuestion: true,
    });
  };

  const handleOpenResultForEdit = async (result: QuizResult) => {
    await openResultForEdit(result);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handlePrepareResultReport = (result: QuizResult) => {
    const questionnaire =
      questionnaires.find((item) => getQuestionnaireRuntimeId(item) === result.questionnaireId) || null;
    const locale = language === 'en' ? 'en-US' : 'ru-RU';

    const nextBundle = buildResultReportBundle({
      result,
      questionnaire,
      language,
    });

    setReportBundle(nextBundle);
    setReportResultId(result.id);
    setReportTitle(`${result.questionnaireTitle} • ${new Date(result.completedAt).toLocaleString(locale)}`);
    setReportError('');
    trackFormActivity('result_report', 'prepare', {
      questionnaire: result.questionnaireId,
    });
  };

  const handleDownloadText = () => {
    if (!reportBundle) return;
    downloadTextReport(reportBundle.formattedText, `${reportBundle.filenameBase}.txt`);
    setReportError('');
    trackFormActivity('result_report', 'download_text');
  };

  const handleDownloadPlainText = () => {
    if (!reportBundle) return;
    downloadPlainTextReport(reportBundle.plainText, `${reportBundle.filenameBase}-plain.txt`);
    setReportError('');
    trackFormActivity('result_report', 'download_plain_text');
  };

  const handlePrintReport = () => {
    if (!reportBundle) return;

    try {
      printReportHtml(reportBundle.html);
      setReportError('');
      trackFormActivity('result_report', 'print');
    } catch {
      setReportError(t('dashboard.report.error.print'));
    }
  };

  const handleCloseReport = () => {
    setReportBundle(null);
    setReportResultId(null);
    setReportTitle('');
    setReportError('');
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportMessage('');
    setImportError('');

    try {
      const summary = await onImportAll(file, importStrategy);
      setImportMessage(
        t('dashboard.import.success', {
          total: summary.total,
          imported: summary.imported,
          replaced: summary.replaced,
          skipped: summary.skipped,
          invalid: summary.invalid,
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('dashboard.import.error');
      setImportError(message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const switchDashboardTab = (tab: 'results' | 'analytics' | 'feedback') => {
    onTabChange?.(tab);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.results.count', { count: results.length })}
        </h2>

        <div className="flex flex-wrap items-stretch gap-2">
          <button
            type="button"
            onClick={() => onExportAll(exportFormat)}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t('dashboard.export.all')}</span>
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            className="w-full sm:w-auto px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            {t('dashboard.import.button')}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('dashboard.transfer.defaults')}
      </p>

      {importMessage && (
        <p className="text-sm text-green-700 dark:text-green-400">{importMessage}</p>
      )}
      {importError && (
        <p className="text-sm text-red-700 dark:text-red-400">{importError}</p>
      )}
      {reportError && <p className="text-sm text-red-700 dark:text-red-400">{reportError}</p>}
      {feedbackMessage && (
        <p className="text-sm text-green-700 dark:text-green-400">{feedbackMessage}</p>
      )}
      {feedbackError && (
        <p className="text-sm text-red-700 dark:text-red-400">{feedbackError}</p>
      )}

      {reportBundle && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('dashboard.report.title', { title: reportTitle })}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.report.description')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadText}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
              >
                {t('dashboard.report.downloadMarkdown')}
              </button>
              <button
                type="button"
                onClick={handleDownloadPlainText}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-800 text-sm dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-200"
              >
                {t('dashboard.report.downloadPlainText')}
              </button>
              <button
                type="button"
                onClick={handlePrintReport}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm"
              >
                {t('dashboard.report.print')}
              </button>
              <button
                type="button"
                onClick={handleCloseReport}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm"
              >
                {t('dashboard.report.close')}
              </button>
            </div>
          </div>

          <iframe
            title={t('dashboard.report.preview')}
            srcDoc={reportBundle.html}
            className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
          />
        </section>
      )}

      {hasResults && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                switchDashboardTab('results');
                trackFormActivity('dashboard_tab', 'open_results');
              }}
              className={`px-3 py-2 rounded-lg text-sm ${
                activeTab === 'results'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('dashboard.tab.results')}
            </button>
            <button
              type="button"
              onClick={() => {
                switchDashboardTab('analytics');
              }}
              className={`px-3 py-2 rounded-lg text-sm ${
                activeTab === 'analytics'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('dashboard.tab.analytics')}
            </button>
            <button
              type="button"
              onClick={() => {
                switchDashboardTab('feedback');
                trackFormActivity('dashboard_tab', 'open_feedback');
              }}
              className={`px-3 py-2 rounded-lg text-sm ${
                activeTab === 'feedback'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('dashboard.tab.feedback')}
            </button>
          </div>
        </section>
      )}

      {hasResults ? (
        activeTab === 'results' ? (
          <>
            <div className="grid gap-6">
              {groupedResults.map((group) => (
                <div
                  key={group.questionnaireId}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {group.questionnaireTitle}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('dashboard.group.summary', {
                            attempts: group.attempts,
                            date: new Date(group.lastCompletedAt).toLocaleDateString(),
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {t('dashboard.group.overall')}
                        </p>
                        <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                          {group.overallScoreTen}/10
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {group.overallScoreLabel} ({group.overallPercentage}%)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('dashboard.group.history')}
                      </p>

                      {group.results.map((result) => (
                        <div
                          key={result.id}
                          id={buildResultAnchorId(result.id, result.completedAt)}
                          className={`border border-gray-200 dark:border-gray-700 rounded-lg p-3 transition-all ${
                            isResultHighlighted(result)
                              ? 'ring-2 ring-primary-400/70 bg-primary-50/40 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                            <div className="flex-1">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.score.total')}</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {result.totalScore} / {result.maxPossibleScore}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.score.percentage')}</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">{result.percentage}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.answered')}</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {Object.keys(result.answers).length} {t('quiz.questions')}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.date')}</p>
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {new Date(result.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {t('quiz.questions')}:
                                </p>
                                {(result.absentInCurrentSchemaQuestionIds?.length || 0) > 0 && (
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {t('dashboard.group.absentQuestions', {
                                      questions: result.absentInCurrentSchemaQuestionIds?.join(', ') || '',
                                    })}
                                  </p>
                                )}
                                {Object.entries(result.answers).map(([questionId, details], idx) => {
                                  const schemaQuestion = questionLookup.get(result.questionnaireId)?.get(questionId);
                                  const questionIndex = schemaQuestion?.index ?? idx;
                                  const questionTitle = schemaQuestion?.title || questionId;
                                  const isExpandedQuestion =
                                    expanded?.resultId === result.id && expanded?.questionId === questionId;

                                  return (
                                    <div
                                      key={questionId}
                                      id={buildQuestionAnchorId(result.id, result.completedAt, questionId)}
                                      className={`border border-gray-200 dark:border-gray-700 rounded-lg transition-all ${
                                        isQuestionHighlighted(result, questionId)
                                          ? 'ring-2 ring-primary-300/70 bg-primary-50/60 dark:bg-primary-900/25'
                                          : ''
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggleQuestionDetails(result.id, questionId)}
                                        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                      >
                                        <div className="flex items-center space-x-3 min-w-0">
                                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            #{questionIndex + 1}
                                          </span>
                                          <span className="text-sm text-gray-800 dark:text-gray-100 truncate max-w-[26rem]">
                                            {questionTitle}
                                          </span>
                                          <span className="font-semibold text-gray-900 dark:text-white">
                                            {details.score}/10
                                          </span>
                                          {result.absentInCurrentSchemaQuestionIds?.includes(questionId) && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                              {t('dashboard.group.absentBadge')}
                                            </span>
                                          )}
                                          {details.comment && <span className="text-xs text-gray-500">📝</span>}
                                          {details.photos && details.photos.length > 0 && (
                                            <span className="text-xs text-gray-500">📷 {details.photos.length}</span>
                                          )}
                                        </div>
                                        <svg
                                          className={`w-5 h-5 text-gray-400 transition-transform ${
                                            isExpandedQuestion ? 'rotate-180' : ''
                                          }`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>

                                      {isExpandedQuestion && (
                                        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap break-words">
                                            <strong>{t('quiz.question')}:</strong> {questionTitle}
                                          </p>
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            <strong>{t('quiz.score.selected')}:</strong> {getGradeDescription(details.score)}
                                          </p>

                                          {details.comment && (
                                            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                📝 {t('quiz.comment.add')}:
                                              </p>
                                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {details.comment}
                                              </p>
                                            </div>
                                          )}

                                          {details.photos && details.photos.length > 0 && (
                                            <div className="grid grid-cols-4 gap-2">
                                              {details.photos.map((photo, photoIdx) => (
                                                <img
                                                  key={photoIdx}
                                                  src={photo}
                                                  alt={`Response visual ${photoIdx + 1}`}
                                                  className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                                  onClick={() => window.open(photo, '_blank')}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleOpenResultForEdit(result)}
                                className="px-2 py-2 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-800 text-xs font-medium transition-colors dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-200"
                              >
                                {t('dashboard.group.openQuestionnaire.action')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrepareResultReport(result)}
                                className={`px-2 py-2 rounded-lg transition-colors text-xs font-medium ${
                                  reportResultId === result.id
                                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                    : 'bg-primary-600 hover:bg-primary-700 text-white'
                                }`}
                              >
                                {t('dashboard.report.create')}
                              </button>
                              <button
                                type="button"
                                onClick={() => onExportResult(result, exportFormat)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title={t('dashboard.export')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                onClick={() => onDeleteResult(result.id)}
                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title={t('dashboard.delete')}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : activeTab === 'analytics' ? (
          <AnalyticsPanel
            results={results}
            questionnaires={questionnaires}
            analyticsUsage={analyticsUsage}
          />
        ) : (
          <section className="space-y-4">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('dashboard.feedback.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.feedback.subtitle')}
              </p>
            </section>

            {feedbackThreads.length === 0 ? (
              <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <p className="text-sm text-gray-600 dark:text-gray-300">{t('dashboard.feedback.empty')}</p>
              </section>
            ) : (
              <div className="grid gap-4">
                {feedbackThreads.map(({ result, questions }) => (
                  <article
                    key={result.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <h4 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                          {result.questionnaireTitle}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(result.completedAt).toLocaleString(language === 'en' ? 'en-US' : 'ru-RU')}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                        {result.percentage}%
                      </p>
                    </div>

                    <div className="space-y-4">
                      {questions.map((question) => {
                        const key = feedbackKey(result.id, question.questionId);
                        const replyValue = replyDrafts[key] || '';
                        const commentValue = commentDrafts[key] ?? question.answerComment;
                        const commentChanged =
                          commentValue.trim() !== (question.answerComment || '').trim();
                        const isSaving = savingFeedbackKey === key;

                        return (
                          <div
                            key={question.questionId}
                            id={buildQuestionAnchorId(
                              result.id,
                              result.completedAt,
                              question.questionId
                            )}
                            className={`rounded-lg border border-gray-200 dark:border-gray-700 p-3 md:p-4 space-y-3 transition-all ${
                              isQuestionHighlighted(result, question.questionId)
                                ? 'ring-2 ring-primary-300/70 bg-primary-50/60 dark:bg-primary-900/25'
                                : ''
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {t('dashboard.feedback.question', { index: question.questionIndex + 1 })}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {question.questionTitle}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-primary-600">
                                  {question.score}/10
                                </p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleOpenQuestionForEdit(
                                      result,
                                      question.questionId,
                                      question.questionIndex
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs"
                                >
                                  {t('dashboard.feedback.openQuestion.action')}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {t('dashboard.feedback.thread')}
                              </p>
                              {question.messages.map((entry) => {
                                const isStudent = entry.authorRole === 'student';
                                const authorName =
                                  entry.authorName ||
                                  entry.curatorName ||
                                  (isStudent
                                    ? t('dashboard.feedback.author.student')
                                    : t('dashboard.feedback.author.curator'));

                                return (
                                  <div
                                    key={entry.id}
                                    className={`rounded-lg p-2 border ${
                                      isStudent
                                        ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/20 dark:border-primary-900/50'
                                        : 'bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        {authorName}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(entry.timestamp).toLocaleString(
                                          language === 'en' ? 'en-US' : 'ru-RU'
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                                      {entry.comment}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {t('dashboard.feedback.comment.label')}
                              </p>
                              <textarea
                                value={commentValue}
                                onChange={(event) =>
                                  updateCommentDraft(result.id, question.questionId, event.target.value)
                                }
                                placeholder={t('dashboard.feedback.comment.placeholder')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none"
                                rows={3}
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveAnswerComment(result, question.questionId)}
                                disabled={!commentChanged || isSaving}
                                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm disabled:opacity-60 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
                              >
                                {t('dashboard.feedback.comment.save')}
                              </button>
                            </div>

                            <div className="space-y-2">
                              <textarea
                                value={replyValue}
                                onChange={(event) =>
                                  updateFeedbackDraft(result.id, question.questionId, event.target.value)
                                }
                                placeholder={t('dashboard.feedback.reply.placeholder')}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm resize-none"
                                rows={3}
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveStudentReply(result, question.questionId)}
                                disabled={!replyValue.trim() || isSaving}
                                className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {t('dashboard.feedback.reply.save')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('dashboard.empty.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('dashboard.empty.description')}
          </p>
        </div>
      )}
    </div>
  );
}
