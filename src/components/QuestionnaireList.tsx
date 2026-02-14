import { useEffect, useMemo, useState } from 'react';
import type {
  Questionnaire,
  StudentQuestionnaireFolder,
  StudentQuestionnaireFoldersState,
} from '../types/questionnaire';
import { t } from '../utils/i18n';
import {
  getQuestionnaireRuntimeId,
  isLocalQuestionnaire,
} from '../utils/questionnaireIdentity';
import type { QuestionnaireLoadStatus } from '../hooks/useQuestionnaires';
import { dataAdapter } from '../services/localStorageAdapter';
import {
  STUDENT_FOLDER_ROOT_KEY,
  createDefaultStudentQuestionnaireFoldersState,
  normalizeStudentQuestionnaireFoldersState,
  parseStudentFolderItemRef,
  parseStudentQuestionnaireItemRef,
} from '../utils/studentQuestionnaireFolders';

interface QuestionnaireListProps {
  questionnaires: Questionnaire[];
  loading: boolean;
  serverStatus?: QuestionnaireLoadStatus;
  pausedQuestionnaireIds?: ReadonlySet<string>;
  onRetryLoad?: () => void;
  onSelect: (questionnaire: Questionnaire) => void;
}

type ListViewMode = 'tiles' | 'tree';

function toParentKey(parentId: string | null): string {
  return parentId || STUDENT_FOLDER_ROOT_KEY;
}

function loadQuestionnaireTitle(questionnaire: Questionnaire, language: string): string {
  const title = questionnaire.metadata.title;
  if (typeof title === 'string') {
    return title;
  }
  return title[language] || title.en || title.ru || '';
}

function getFolderKindLabel(folder: StudentQuestionnaireFolder): string {
  return folder.kind === 'system' ? t('quiz.folders.systemTag') : t('quiz.folders.userTag');
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
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folderError, setFolderError] = useState('');
  const [viewMode, setViewMode] = useState<ListViewMode>('tiles');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [folderState, setFolderState] = useState<StudentQuestionnaireFoldersState>(() =>
    createDefaultStudentQuestionnaireFoldersState()
  );

  const questionnaireDescriptors = useMemo(
    () =>
      questionnaires.map((questionnaire) => ({
        id: getQuestionnaireRuntimeId(questionnaire),
        systemFolders: questionnaire.metadata.system_folders || [],
      })),
    [questionnaires]
  );

  const questionnaireSignature = useMemo(
    () =>
      questionnaireDescriptors
        .map((item) => `${item.id}::${(item.systemFolders || []).join('|')}`)
        .join('\u0001'),
    [questionnaireDescriptors]
  );

  const questionnaireById = useMemo(() => {
    const next = new Map<string, Questionnaire>();
    for (const questionnaire of questionnaires) {
      next.set(getQuestionnaireRuntimeId(questionnaire), questionnaire);
    }
    return next;
  }, [questionnaires]);

  const folderById = useMemo(() => {
    const next = new Map<string, StudentQuestionnaireFolder>();
    for (const folder of folderState.folders) {
      next.set(folder.id, folder);
    }
    return next;
  }, [folderState.folders]);

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

  useEffect(() => {
    let active = true;

    const loadFolders = async () => {
      setFoldersLoading(true);
      setFolderError('');
      try {
        const stored = await dataAdapter.getStudentQuestionnaireFolders();
        const normalized = normalizeStudentQuestionnaireFoldersState(
          stored,
          questionnaireDescriptors
        );
        if (!active) {
          return;
        }
        setFolderState(normalized);
        await dataAdapter.saveStudentQuestionnaireFolders(normalized);
      } catch (error) {
        console.error('Failed to load student questionnaire folders:', error);
        if (!active) {
          return;
        }
        setFolderError(t('quiz.folders.error.load'));
        setFolderState(
          normalizeStudentQuestionnaireFoldersState(
            createDefaultStudentQuestionnaireFoldersState(),
            questionnaireDescriptors
          )
        );
      } finally {
        if (active) {
          setFoldersLoading(false);
        }
      }
    };

    void loadFolders();

    return () => {
      active = false;
    };
  }, [questionnaireDescriptors, questionnaireSignature]);

  useEffect(() => {
    if (activeFolderId && !folderById.has(activeFolderId)) {
      setActiveFolderId(null);
    }
  }, [activeFolderId, folderById]);

  const autoRetryInSeconds = useMemo(() => {
    if (!serverStatus?.nextRetryAt) {
      return null;
    }
    return Math.max(0, Math.ceil((serverStatus.nextRetryAt - now) / 1000));
  }, [now, serverStatus?.nextRetryAt]);

  const folderQuestionnaireCount = useMemo(() => {
    const cache = new Map<string, number>();

    const countForFolder = (folderId: string): number => {
      if (cache.has(folderId)) {
        return cache.get(folderId) || 0;
      }

      let total = 0;
      const items = folderState.itemOrderByParent[folderId] || [];
      for (const itemRef of items) {
        const childFolderId = parseStudentFolderItemRef(itemRef);
        if (childFolderId && folderById.has(childFolderId)) {
          total += countForFolder(childFolderId);
          continue;
        }

        const questionnaireId = parseStudentQuestionnaireItemRef(itemRef);
        if (questionnaireId && questionnaireById.has(questionnaireId)) {
          total += 1;
        }
      }

      cache.set(folderId, total);
      return total;
    };

    for (const folder of folderState.folders) {
      countForFolder(folder.id);
    }

    return cache;
  }, [folderById, folderState.folders, folderState.itemOrderByParent, questionnaireById]);

  const folderBreadcrumb = useMemo(() => {
    const chain: StudentQuestionnaireFolder[] = [];
    let cursor = activeFolderId;
    const visited = new Set<string>();

    while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      const folder = folderById.get(cursor);
      if (!folder) {
        break;
      }
      chain.unshift(folder);
      cursor = folder.parentId;
    }

    return chain;
  }, [activeFolderId, folderById]);

  const visibleParentKey = toParentKey(activeFolderId);
  const visibleItemRefs = folderState.itemOrderByParent[visibleParentKey] || [];

  const visibleFolders = useMemo(() => {
    const next: StudentQuestionnaireFolder[] = [];
    for (const itemRef of visibleItemRefs) {
      const folderId = parseStudentFolderItemRef(itemRef);
      if (!folderId) {
        continue;
      }

      const folder = folderById.get(folderId);
      if (folder) {
        next.push(folder);
      }
    }
    return next;
  }, [folderById, visibleItemRefs]);

  const visibleQuestionnaires = useMemo(() => {
    const next: Questionnaire[] = [];
    for (const itemRef of visibleItemRefs) {
      const questionnaireId = parseStudentQuestionnaireItemRef(itemRef);
      if (!questionnaireId) {
        continue;
      }

      const questionnaire = questionnaireById.get(questionnaireId);
      if (questionnaire) {
        next.push(questionnaire);
      }
    }
    return next;
  }, [questionnaireById, visibleItemRefs]);

  const setFolderExpanded = (folderId: string, expanded: boolean) => {
    setExpandedFolderIds((prev) => ({
      ...prev,
      [folderId]: expanded,
    }));
  };

  const renderQuestionnaireCard = (questionnaire: Questionnaire) => {
    const runtimeId = getQuestionnaireRuntimeId(questionnaire);
    const isPaused = Boolean(pausedQuestionnaireIds?.has(runtimeId));

    return (
      <article
        key={runtimeId}
        data-questionnaire-id={runtimeId}
        data-paused={isPaused ? 'true' : 'false'}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="p-4 md:p-5 space-y-4 h-full flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
              {loadQuestionnaireTitle(questionnaire, language)}
            </h3>
            <div className="flex items-center gap-1">
              {isPaused && (
                <span className="text-[11px] px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 whitespace-nowrap">
                  {t('quiz.paused.continue')}
                </span>
              )}
              {isLocalQuestionnaire(questionnaire) && (
                <span className="text-[11px] px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 whitespace-nowrap">
                  {localLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              {questionnaire.questions.length} {t('quiz.questions')}
            </span>
            <span>{t('quiz.scale')}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelect(questionnaire)}
            data-testid={`questionnaire-select-${runtimeId}`}
            className={
              isPaused
                ? 'mt-auto w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors'
                : 'mt-auto w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors'
            }
          >
            {isPaused ? t('quiz.paused.continue') : t('quiz.start')}
          </button>
        </div>
      </article>
    );
  };

  const renderTree = (parentId: string | null, depth: number): JSX.Element[] => {
    const parentKey = toParentKey(parentId);
    const refs = folderState.itemOrderByParent[parentKey] || [];

    return refs.flatMap((itemRef) => {
      const folderId = parseStudentFolderItemRef(itemRef);
      if (folderId) {
        const folder = folderById.get(folderId);
        if (!folder) {
          return [];
        }

        const expanded = expandedFolderIds[folder.id] ?? depth < 2;
        const count = folderQuestionnaireCount.get(folder.id) || 0;

        return [
          <div key={itemRef} className="space-y-1">
            <div
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ paddingLeft: `${depth * 18 + 4}px` }}
            >
              <button
                type="button"
                onClick={() => setFolderExpanded(folder.id, !expanded)}
                className="w-8 h-8 text-lg font-semibold leading-none text-gray-500 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={expanded ? t('quiz.folders.tree.collapse') : t('quiz.folders.tree.expand')}
              >
                {expanded ? '▾' : '▸'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFolderId(folder.id);
                  setViewMode('tiles');
                }}
                className="text-left text-sm text-gray-800 dark:text-gray-100 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {folder.kind === 'system' ? '🗂' : '📁'} {folder.name}
              </button>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-gray-700 px-1.5 py-0.5">
                {getFolderKindLabel(folder)}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {t('quiz.folders.tree.count', { count })}
              </span>
            </div>

            {expanded && <div>{renderTree(folder.id, depth + 1)}</div>}
          </div>,
        ];
      }

      const questionnaireId = parseStudentQuestionnaireItemRef(itemRef);
      if (!questionnaireId) {
        return [];
      }

      const questionnaire = questionnaireById.get(questionnaireId);
      if (!questionnaire) {
        return [];
      }

      const runtimeId = getQuestionnaireRuntimeId(questionnaire);
      const isPaused = Boolean(pausedQuestionnaireIds?.has(runtimeId));

      return [
        <div
          key={itemRef}
          className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ paddingLeft: `${depth * 18 + 28}px` }}
        >
          <div className="min-w-0">
            <p className="text-sm text-gray-800 dark:text-gray-100 truncate">
              {loadQuestionnaireTitle(questionnaire, language)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {questionnaire.questions.length} {t('quiz.questions')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(questionnaire)}
            className={
              isPaused
                ? 'text-xs px-2 py-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'text-xs px-2 py-1 rounded bg-primary-600 hover:bg-primary-700 text-white'
            }
          >
            {isPaused ? t('quiz.paused.continue') : t('quiz.start')}
          </button>
        </div>,
      ];
    });
  };

  if (loading || foldersLoading) {
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
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('quiz.loading.retryingHint')}</p>
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
        <p className="text-gray-600 dark:text-gray-400">{t('quiz.noQuizzes')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
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

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
              {t('quiz.folders.title')}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
              {t('quiz.folders.studentHint')}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setViewMode('tiles')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'tiles'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('quiz.folders.view.tiles')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                viewMode === 'tree'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {t('quiz.folders.view.tree')}
            </button>
          </div>
        </div>

        {folderError && <p className="text-sm text-red-700 dark:text-red-300">{folderError}</p>}
      </section>

      {viewMode === 'tiles' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setActiveFolderId(null)}
              className={`px-2 py-1 rounded ${
                activeFolderId === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
              }`}
            >
              {t('quiz.folders.rootOption')}
            </button>
            {folderBreadcrumb.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolderId(folder.id)}
                className={`px-2 py-1 rounded ${
                  activeFolderId === folder.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                {folder.name}
              </button>
            ))}

            {activeFolderId && (
              <button
                type="button"
                onClick={() => setActiveFolderId(folderById.get(activeFolderId)?.parentId || null)}
                className="ml-auto text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t('quiz.folders.back')}
              </button>
            )}
          </div>

          {visibleFolders.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className="text-left rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {folder.kind === 'system' ? '🗂' : '📁'} {folder.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {getFolderKindLabel(folder)}
                  </p>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    {t('quiz.folders.tree.count', {
                      count: folderQuestionnaireCount.get(folder.id) || 0,
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}

          {visibleQuestionnaires.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleQuestionnaires.map((questionnaire) => renderQuestionnaireCard(questionnaire))}
            </div>
          ) : (
            visibleFolders.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('quiz.folders.empty')}</p>
            )
          )}
        </section>
      )}

      {viewMode === 'tree' && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/20 p-3 md:p-4">
          {renderTree(null, 0)}
        </section>
      )}
    </div>
  );
}
