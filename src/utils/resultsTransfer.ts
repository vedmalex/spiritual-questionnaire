import type { AnswerDetails, CuratorFeedback, QuizResult, ReviewStatus, UserRole } from '../types/questionnaire';

export type ImportStrategy = 'skip' | 'replace';

export interface ImportSummary {
  total: number;
  imported: number;
  replaced: number;
  skipped: number;
  invalid: number;
}

export interface ParsedTransferResults {
  totalRaw: number;
  valid: QuizResult[];
}

interface MergeOptions {
  preferCuratorFeedbackReplace?: boolean;
}

interface TransferPayload {
  exportedAt: string;
  version: string;
  totalResults: number;
  results: QuizResult[];
}

function buildAnswerSignature(result: QuizResult): string {
  return Object.keys(result.answers)
    .sort()
    .map((questionId) => {
      const answer = result.answers[questionId];
      const comment = (answer.comment || '').trim();
      const photosCount = Array.isArray(answer.photos) ? answer.photos.length : 0;
      return `${questionId}:${answer.score}:${comment}:${photosCount}`;
    })
    .join('|');
}

function buildResultFingerprint(result: QuizResult): string {
  return [
    result.userName.trim().toLowerCase(),
    result.questionnaireId,
    String(result.completedAt),
    String(result.totalScore),
    String(result.maxPossibleScore),
    buildAnswerSignature(result),
  ].join('::');
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toTimestamp(value: unknown): number {
  const asNumber = toNumberOrNull(value);
  if (asNumber !== null) return asNumber;

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return Date.now();
}

function toUserRole(value: unknown): UserRole {
  if (value === 'admin') return 'admin';
  return value === 'curator' ? 'curator' : 'student';
}

function toReviewStatus(value: unknown): ReviewStatus {
  if (value === 'approved') {
    return 'needs_revision';
  }
  if (
    value === 'in_review' ||
    value === 'reviewed' ||
    value === 'needs_revision'
  ) {
    return value;
  }
  return 'pending';
}

function normalizeFeedback(feedback: unknown): CuratorFeedback[] {
  if (!Array.isArray(feedback)) return [];

  return feedback
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => {
      const authorRole: CuratorFeedback['authorRole'] =
        entry.authorRole === 'student' ? 'student' : 'curator';
      const authorName = String(
        entry.authorName ||
          entry.curatorName ||
          (authorRole === 'student' ? 'Студент' : 'Куратор')
      );

      return {
        id: String(entry.id || `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        curatorName: String(entry.curatorName || authorName || 'Куратор'),
        questionId: String(entry.questionId || ''),
        comment: String(entry.comment || ''),
        timestamp: toTimestamp(entry.timestamp),
        authorRole,
        authorName,
      };
    })
    .filter((entry) => Boolean(entry.questionId));
}

function normalizeAnswerDetails(details: any): AnswerDetails {
  const score = toNumberOrNull(details?.score);
  const safeScore = score ?? 0;

  return {
    score: safeScore,
    comment: typeof details?.comment === 'string' ? details.comment : '',
    photos: Array.isArray(details?.photos)
      ? details.photos.filter((photo: unknown) => typeof photo === 'string')
      : [],
    curatorFeedback: normalizeFeedback(details?.curatorFeedback),
  };
}

function normalizeAnswers(rawAnswers: unknown): Record<string, AnswerDetails> {
  if (!rawAnswers) return {};

  if (Array.isArray(rawAnswers)) {
    const mapped = rawAnswers
      .filter((item) => item && typeof item === 'object')
      .map((item: any) => {
        const questionId = String(item.questionId || item.id || '');
        if (!questionId) return null;
        return [questionId, normalizeAnswerDetails(item)] as const;
      })
      .filter((item): item is readonly [string, AnswerDetails] => Boolean(item));

    return Object.fromEntries(mapped);
  }

  if (typeof rawAnswers === 'object') {
    return Object.fromEntries(
      Object.entries(rawAnswers as Record<string, unknown>)
        .filter(([questionId]) => Boolean(questionId))
        .map(([questionId, details]) => [questionId, normalizeAnswerDetails(details)])
    );
  }

  return {};
}

function normalizeComputedResult(rawComputed: unknown): QuizResult['computed_result'] | undefined {
  if (!rawComputed || typeof rawComputed !== 'object') {
    return undefined;
  }

  const source = rawComputed as Record<string, unknown>;
  const metricsRaw = source.metrics;
  const rankingRaw = source.ranking;

  const metrics =
    metricsRaw && typeof metricsRaw === 'object'
      ? Object.fromEntries(
          Object.entries(metricsRaw as Record<string, unknown>).filter(
            ([key, value]) =>
              Boolean(key) && typeof value === 'number' && Number.isFinite(value)
          )
        )
      : {};
  const ranking = Array.isArray(rankingRaw)
    ? rankingRaw.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : [];

  const honestyRaw = source.honesty_checks;
  let honestyChecks: QuizResult['computed_result']['honesty_checks'] | undefined;
  if (honestyRaw && typeof honestyRaw === 'object') {
    const honestyRecord = honestyRaw as Record<string, unknown>;
    const checksRaw = honestyRecord.checks;
    const checks = Array.isArray(checksRaw)
      ? checksRaw
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => {
            const check = entry as Record<string, unknown>;
            const id = typeof check.id === 'string' ? check.id.trim() : '';
            if (!id) {
              return null;
            }
            const value =
              typeof check.value === 'number' && Number.isFinite(check.value) ? check.value : 0;
            const passed = Boolean(check.passed);
            const severity =
              check.severity === 'info' ||
              check.severity === 'warning' ||
              check.severity === 'critical'
                ? check.severity
                : 'warning';

            return {
              id,
              passed,
              value,
              severity,
            };
          })
          .filter(
            (
              entry
            ): entry is NonNullable<QuizResult['computed_result']>['honesty_checks']['checks'][number] =>
              Boolean(entry)
          )
      : [];

    if (checks.length > 0) {
      const allPassedRaw = honestyRecord.all_passed;
      const failedCountRaw = honestyRecord.failed_count;
      const allPassed =
        typeof allPassedRaw === 'boolean'
          ? allPassedRaw
          : checks.every((check) => check.passed);
      const failedCount =
        typeof failedCountRaw === 'number' && Number.isFinite(failedCountRaw)
          ? Math.max(0, Math.round(failedCountRaw))
          : checks.filter((check) => !check.passed).length;

      honestyChecks = {
        all_passed: allPassed,
        failed_count: failedCount,
        checks,
      };
    }
  }

  if (
    Object.keys(metrics).length === 0 &&
    ranking.length === 0 &&
    !honestyChecks
  ) {
    return undefined;
  }

  const errors = Array.isArray(source.errors)
    ? source.errors.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      )
    : [];

  return {
    version: 1,
    engine: 'rules-v1',
    metrics,
    ranking,
    ...(honestyChecks ? { honesty_checks: honestyChecks } : {}),
    ...(errors.length > 0 ? { errors } : {}),
  };
}

function normalizeResult(rawResult: unknown): QuizResult | null {
  if (!rawResult || typeof rawResult !== 'object') return null;

  const source = rawResult as Record<string, unknown>;
  const answers = normalizeAnswers(source.answers);
  const totalScoreFromAnswers = Object.values(answers).reduce((sum, answer) => sum + answer.score, 0);
  const maxPossibleFromAnswers = Object.keys(answers).length * 10;

  const maxPossibleScore =
    toNumberOrNull(source.maxPossibleScore) ?? (maxPossibleFromAnswers > 0 ? maxPossibleFromAnswers : 10);
  const totalScore = toNumberOrNull(source.totalScore) ?? totalScoreFromAnswers;
  const percentage =
    toNumberOrNull(source.percentage) ??
    (maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0);

  return {
    id: String(source.id || `result_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    questionnaireId: String(source.questionnaireId || 'unknown-questionnaire'),
    questionnaireTitle: String(source.questionnaireTitle || source.questionnaireId || 'Questionnaire'),
    userName: String(source.userName || 'Unknown'),
    userRole: toUserRole(source.userRole),
    completedAt: toTimestamp(source.completedAt),
    answers,
    totalScore,
    maxPossibleScore,
    percentage,
    reviewStatus: toReviewStatus(source.reviewStatus),
    absentInCurrentSchemaQuestionIds: Array.isArray(source.absentInCurrentSchemaQuestionIds)
      ? source.absentInCurrentSchemaQuestionIds.filter(
          (questionId): questionId is string => typeof questionId === 'string'
        )
      : [],
    assignedCurator:
      typeof source.assignedCurator === 'string' && source.assignedCurator.trim()
        ? source.assignedCurator
        : undefined,
    reviewCompletedAt:
      source.reviewCompletedAt !== undefined ? toTimestamp(source.reviewCompletedAt) : undefined,
    computed_result: normalizeComputedResult(source.computed_result),
  };
}

function extractRawResults(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    const asRecord = payload as Record<string, unknown>;

    if (Array.isArray(asRecord.results)) return asRecord.results;
    if (asRecord.result) return [asRecord.result];
  }

  return [];
}

export function buildResultsTransferPayload(results: QuizResult[]): TransferPayload {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    totalResults: results.length,
    results,
  };
}

export function parseResultsTransferPayload(content: string): ParsedTransferResults {
  const parsed = JSON.parse(content);
  const rawResults = extractRawResults(parsed);

  const valid = rawResults
    .map((rawResult) => normalizeResult(rawResult))
    .filter((result): result is QuizResult => Boolean(result));

  return {
    totalRaw: rawResults.length,
    valid,
  };
}

export function mergeImportedResults(
  existingResults: QuizResult[],
  importedResults: QuizResult[],
  strategy: ImportStrategy,
  invalidCount = 0,
  options: MergeOptions = {}
): { merged: QuizResult[]; summary: ImportSummary } {
  const existingMap = new Map(existingResults.map((result) => [result.id, result]));
  const fingerprintToId = new Map<string, string>();
  for (const result of existingResults) {
    fingerprintToId.set(buildResultFingerprint(result), result.id);
  }

  const preferCuratorFeedbackReplace = Boolean(options.preferCuratorFeedbackReplace);
  const hasFeedback = (result: QuizResult): boolean =>
    Object.values(result.answers).some((answer) =>
      (answer.curatorFeedback || []).some((entry) => String(entry.comment || '').trim().length > 0)
    );

  const replaceById = (targetId: string, incoming: QuizResult) => {
    const previous = existingMap.get(targetId);
    if (previous) {
      fingerprintToId.delete(buildResultFingerprint(previous));
    }

    const nextResult = targetId === incoming.id ? incoming : { ...incoming, id: targetId };
    existingMap.set(targetId, nextResult);
    fingerprintToId.set(buildResultFingerprint(nextResult), targetId);
  };

  let imported = 0;
  let replaced = 0;
  let skipped = 0;

  for (const result of importedResults) {
    const hasExisting = existingMap.has(result.id);
    const fingerprint = buildResultFingerprint(result);
    const existingIdByFingerprint = fingerprintToId.get(fingerprint);
    const shouldPreferReplace = preferCuratorFeedbackReplace && hasFeedback(result);

    if (!hasExisting) {
      if (existingIdByFingerprint) {
        if (strategy === 'replace' || shouldPreferReplace) {
          replaceById(existingIdByFingerprint, result);
          replaced += 1;
          continue;
        }
        skipped += 1;
        continue;
      }
      existingMap.set(result.id, result);
      fingerprintToId.set(fingerprint, result.id);
      imported += 1;
      continue;
    }

    if (strategy === 'replace' || shouldPreferReplace) {
      replaceById(result.id, result);
      replaced += 1;
      continue;
    }

    skipped += 1;
  }

  const merged = Array.from(existingMap.values()).sort((a, b) => b.completedAt - a.completedAt);

  return {
    merged,
    summary: {
      total: importedResults.length,
      imported,
      replaced,
      skipped,
      invalid: invalidCount,
    },
  };
}
