import { useMemo, useRef, useState } from 'react';
import type {
  CuratorFeedback,
  Questionnaire,
  QuizResult,
  ReviewStatus,
} from '../types/questionnaire';
import { useResults } from '../hooks/useResults';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { useUser } from '../hooks/useUser';
import { exportResults } from '../utils/exportUtils';
import { getGradeDescription, getLanguage, t } from '../utils/i18n';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';
import { MarkdownContent } from './ui/MarkdownContent';
import { MarkdownEditor } from './ui/MarkdownEditor';
import { hasMarkdownContent, mergeLegacyCommentWithPhotos } from '../utils/markdown';

interface FeedbackTarget {
  resultId: string;
  questionId: string;
}

interface CuratorResultGroup {
  groupId: string;
  questionnaireId: string;
  questionnaireTitle: string;
  userName: string;
  results: QuizResult[];
  pendingCount: number;
  reviewedCount: number;
  totalCount: number;
  lastCompletedAt: number;
}

function isPendingStatus(status: ReviewStatus): boolean {
  return status === 'pending' || status === 'in_review';
}

function isReviewedStatus(status: ReviewStatus): boolean {
  return (
    status === 'reviewed' ||
    status === 'needs_revision' ||
    status === 'approved'
  );
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

export function CuratorDashboard() {
  const { results, loading, updateResult, importAllResults } = useResults('curator');
  const { questionnaires } = useQuestionnaires();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState<FeedbackTarget | null>(null);
  const [savingFeedbackKey, setSavingFeedbackKey] = useState<string | null>(null);
  const [opsMessage, setOpsMessage] = useState('');
  const [opsError, setOpsError] = useState('');

  const curatorName = user?.name || t('header.role.curator');
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

  const pendingResults = results.filter((result) => isPendingStatus(result.reviewStatus));
  const reviewedResults = results.filter((result) => isReviewedStatus(result.reviewStatus));

  const groupedResults = useMemo<CuratorResultGroup[]>(() => {
    const groupMap = new Map<string, CuratorResultGroup>();

    for (const result of results) {
      const userKey = result.userName.trim().toLowerCase();
      const groupId = `${result.questionnaireId}::${userKey}`;
      const current = groupMap.get(groupId);

      if (!current) {
        groupMap.set(groupId, {
          groupId,
          questionnaireId: result.questionnaireId,
          questionnaireTitle: result.questionnaireTitle,
          userName: result.userName,
          results: [result],
          pendingCount: isPendingStatus(result.reviewStatus) ? 1 : 0,
          reviewedCount: isReviewedStatus(result.reviewStatus) ? 1 : 0,
          totalCount: 1,
          lastCompletedAt: result.completedAt,
        });
        continue;
      }

      current.results.push(result);
      current.totalCount += 1;
      current.pendingCount += isPendingStatus(result.reviewStatus) ? 1 : 0;
      current.reviewedCount += isReviewedStatus(result.reviewStatus) ? 1 : 0;
      current.lastCompletedAt = Math.max(current.lastCompletedAt, result.completedAt);
    }

    const groups = Array.from(groupMap.values());
    for (const group of groups) {
      group.results.sort((a, b) => b.completedAt - a.completedAt);
    }

    return groups.sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [results]);

  const activeGroups = groupedResults.filter((group) => group.pendingCount > 0);
  const completedGroups = groupedResults.filter(
    (group) => group.pendingCount === 0 && group.reviewedCount > 0
  );

  const getStatusBadge = (status: ReviewStatus) => {
    const styles: Record<ReviewStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      reviewed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      needs_revision: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      approved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };

    const labels: Record<ReviewStatus, string> = {
      pending: t('curator.status.pending'),
      in_review: t('curator.status.inReview'),
      reviewed: t('curator.status.reviewed'),
      needs_revision: t('curator.status.needsRevision'),
      approved: t('curator.status.needsRevision'),
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const updateReviewStatus = async (result: QuizResult, status: ReviewStatus) => {
    const updatedResult: QuizResult = {
      ...result,
      reviewStatus: status,
      assignedCurator: result.assignedCurator || curatorName,
      reviewCompletedAt: isReviewedStatus(status) ? Date.now() : undefined,
    };

    await updateResult(updatedResult);
  };

  const handleToggleResult = async (result: QuizResult) => {
    if (selectedResultId === result.id) {
      setSelectedResultId(null);
      setFeedbackTarget(null);
      setFeedbackText('');
      return;
    }

    if (result.reviewStatus === 'pending') {
      const inReviewResult: QuizResult = {
        ...result,
        reviewStatus: 'in_review',
        assignedCurator: result.assignedCurator || curatorName,
      };
      await updateResult(inReviewResult);
    }

    setSelectedResultId(result.id);
  };

  const saveFeedback = async (
    result: QuizResult,
    questionId: string,
    rawText: string,
    closeEditor = true
  ) => {
    if (!hasMarkdownContent(rawText)) {
      if (closeEditor) {
        setFeedbackTarget(null);
        setFeedbackText('');
      }
      return;
    }
    const text = rawText.trim();

    const key = `${result.id}::${questionId}`;
    if (savingFeedbackKey === key) return;

    const answer = result.answers[questionId];
    if (!answer) return;

    const newFeedback: CuratorFeedback = {
      id: `feedback_${Date.now()}`,
      curatorName,
      questionId,
      comment: text,
      timestamp: Date.now(),
      authorRole: 'curator',
      authorName: curatorName,
    };

    const updatedResult: QuizResult = {
      ...result,
      reviewStatus: result.reviewStatus === 'pending' ? 'in_review' : result.reviewStatus,
      assignedCurator: result.assignedCurator || curatorName,
      answers: {
        ...result.answers,
        [questionId]: {
          ...answer,
          curatorFeedback: [...(answer.curatorFeedback || []), newFeedback],
        },
      },
    };

    setSavingFeedbackKey(key);
    try {
      await updateResult(updatedResult);
      setFeedbackText('');
      if (closeEditor) {
        setFeedbackTarget(null);
      }
    } finally {
      setSavingFeedbackKey((prev) => (prev === key ? null : prev));
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setOpsError('');
    setOpsMessage('');
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const summary = await importAllResults(file, 'replace');
      setOpsMessage(
        t('curator.message.importSummary', {
          total: summary.total,
          imported: summary.imported,
          replaced: summary.replaced,
          skipped: summary.skipped,
          invalid: summary.invalid,
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('curator.error.import');
      setOpsError(message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleExportGroupForStudent = (group: CuratorResultGroup) => {
    setOpsError('');
    setOpsMessage('');

    const reviewedGroupResults = group.results.filter((result) =>
      isReviewedStatus(result.reviewStatus)
    );

    if (reviewedGroupResults.length === 0) {
      setOpsError(
        t('curator.error.groupNoReviewed', {
          group: `${group.userName} / ${group.questionnaireTitle}`,
        })
      );
      return;
    }

    const fileName = `curator-transfer-${sanitizeFilenamePart(group.userName)}-${sanitizeFilenamePart(
      group.questionnaireId
    )}-${Date.now()}.json`;
    exportResults(reviewedGroupResults, 'json', fileName);
    setOpsMessage(
      t('curator.message.exportGroup', {
        count: reviewedGroupResults.length,
        userName: group.userName,
      })
    );
  };

  const handleExportAllReviewed = () => {
    setOpsError('');
    setOpsMessage('');

    if (reviewedResults.length === 0) {
      setOpsError(t('curator.error.noReviewed'));
      return;
    }

    exportResults(reviewedResults, 'json', `curator-reviewed-results-${Date.now()}.json`);
    setOpsMessage(
      t('curator.message.exportAll', {
        count: reviewedResults.length,
      })
    );
  };

  const renderResultCard = (result: QuizResult) => {
    const expanded = selectedResultId === result.id;
    const schemaLookup = questionLookup.get(result.questionnaireId);

    return (
      <div
        key={result.id}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                  {result.userName}
                </h3>
                {getStatusBadge(result.reviewStatus)}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.questionnaireTitle}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(result.completedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-primary-600">
                {result.percentage}%
              </span>
              <button
                type="button"
                onClick={() => handleToggleResult(result)}
                className="px-3 py-1 md:px-4 md:py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
              >
                {expanded ? t('curator.actions.hide') : t('curator.actions.review')}
              </button>
            </div>
          </div>

          {expanded && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateReviewStatus(result, 'reviewed')}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  {t('curator.actions.markReviewed')}
                </button>
                <button
                  type="button"
                  onClick={() => updateReviewStatus(result, 'needs_revision')}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors"
                >
                  {t('curator.actions.requestRevision')}
                </button>
              </div>

              {(result.absentInCurrentSchemaQuestionIds?.length || 0) > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t('curator.schema.absentQuestions', {
                    questions: result.absentInCurrentSchemaQuestionIds?.join(', ') || '',
                  })}
                </p>
              )}

              {Object.entries(result.answers).map(([questionId, details], index) => {
                const isFeedbackTarget =
                  feedbackTarget?.resultId === result.id &&
                  feedbackTarget?.questionId === questionId;
                const schemaQuestion = schemaLookup?.get(questionId);
                const questionIndex = schemaQuestion?.index ?? index;
                const questionTitle = schemaQuestion?.title || questionId;
                const studentCommentMarkdown = mergeLegacyCommentWithPhotos(
                  details.comment || '',
                  details.photos || []
                );
                const hasStudentComment = hasMarkdownContent(studentCommentMarkdown);

                return (
                  <div
                    key={questionId}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('curator.question.label', { index: questionIndex + 1 })}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {questionTitle}
                      </span>
                      <span className="font-bold text-primary-600">{details.score}/10</span>
                      <span className="text-xs text-gray-500">
                        {getGradeDescription(details.score)}
                      </span>
                      {result.absentInCurrentSchemaQuestionIds?.includes(questionId) && (
                        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {t('curator.question.absent')}
                        </span>
                      )}
                    </div>

                    {hasStudentComment && (
                      <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded border-l-4 border-primary-400">
                        <p className="text-xs text-gray-500 mb-1">{t('curator.comment.student')}</p>
                        <MarkdownContent markdown={studentCommentMarkdown} />
                      </div>
                    )}

                    {details.curatorFeedback && details.curatorFeedback.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {details.curatorFeedback.map((feedback) => (
                          <div
                            key={feedback.id}
                            className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {feedback.curatorName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(feedback.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <MarkdownContent
                              markdown={feedback.comment}
                              className="text-blue-800 dark:text-blue-200"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-3">
                      {isFeedbackTarget ? (
                        <div className="space-y-2">
                          <MarkdownEditor
                            value={feedbackText}
                            onChange={(value) => setFeedbackText(value)}
                            placeholder={t('curator.feedback.placeholder')}
                            allowImages
                            minHeightClassName="min-h-[96px]"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              data-feedback-action="send"
                              onClick={() => void saveFeedback(result, questionId, feedbackText, true)}
                              disabled={
                                savingFeedbackKey === `${result.id}::${questionId}` ||
                                !hasMarkdownContent(feedbackText)
                              }
                              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm transition-colors"
                            >
                              {t('curator.feedback.send')}
                            </button>
                            <button
                              type="button"
                              data-feedback-action="cancel"
                              onClick={() => {
                                setFeedbackTarget(null);
                                setFeedbackText('');
                              }}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
                            >
                              {t('curator.feedback.cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFeedbackTarget({ resultId: result.id, questionId })}
                          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          {t('curator.feedback.add')}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('curator.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
          {t('curator.subtitle')}
        </p>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportAllReviewed}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
          >
            {t('curator.ops.exportAllReviewed')}
          </button>

          <button
            type="button"
            onClick={handleImportClick}
            className="w-full sm:w-auto px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
          >
            {t('curator.ops.importStudentAnswers')}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">{t('curator.ops.defaults')}</p>

        {opsMessage && (
          <p className="text-sm text-green-700 dark:text-green-400">{opsMessage}</p>
        )}
        {opsError && <p className="text-sm text-red-700 dark:text-red-400">{opsError}</p>}
      </section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 md:mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {t('curator.metrics.totalAnswers')}
          </p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {results.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {t('curator.metrics.groupCount')}
          </p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {groupedResults.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {t('curator.metrics.pending')}
          </p>
          <p className="text-xl md:text-2xl font-bold text-yellow-600">{pendingResults.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {t('curator.metrics.reviewed')}
          </p>
          <p className="text-xl md:text-2xl font-bold text-green-600">{reviewedResults.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {t('curator.metrics.averageScore')}
          </p>
          <p className="text-xl md:text-2xl font-bold text-primary-600">
            {results.length > 0
              ? Math.round(
                  results.reduce((sum, item) => sum + item.percentage, 0) / results.length
                )
              : 0}
            %
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
            {t('curator.section.activeGroups', { count: activeGroups.length })}
          </h2>

          {activeGroups.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">
                {t('curator.empty.activeGroups')}
              </p>
            </div>
          ) : (
            activeGroups.map((group) => (
              <article
                key={group.groupId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                      {group.userName} • {group.questionnaireTitle}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      {t('curator.group.summary', {
                        total: group.totalCount,
                        pending: group.pendingCount,
                        reviewed: group.reviewedCount,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportGroupForStudent(group)}
                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    {t('curator.ops.exportForStudent')}
                  </button>
                </div>

                <div className="grid gap-4">{group.results.map((result) => renderResultCard(result))}</div>
              </article>
            ))
          )}
        </section>

        {completedGroups.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              {t('curator.section.completedGroups', { count: completedGroups.length })}
            </h2>

            {completedGroups.map((group) => (
              <article
                key={group.groupId}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                      {group.userName} • {group.questionnaireTitle}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                      {t('curator.group.reviewedSummary', { count: group.reviewedCount })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportGroupForStudent(group)}
                    className="w-full sm:w-auto px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                  >
                    {t('curator.ops.exportForStudent')}
                  </button>
                </div>

                <div className="grid gap-4">{group.results.map((result) => renderResultCard(result))}</div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
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
