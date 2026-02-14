import { useEffect, useMemo, useState } from 'react';
import type {
  Questionnaire,
  StudentQuestionnaireFolder,
  StudentQuestionnaireFoldersState,
} from '../types/questionnaire';
import { t } from '../utils/i18n';
import { dataAdapter } from '../services/localStorageAdapter';
import {
  STUDENT_FOLDER_ROOT_KEY,
  createDefaultStudentQuestionnaireFoldersState,
  createStudentQuestionnaireFolderWithItems,
  deleteStudentQuestionnaireFolder,
  isStudentFolderDescendant,
  listStudentFolderParentOptions,
  moveStudentItemByOffset,
  moveStudentItemToParent,
  normalizeStudentQuestionnaireFoldersState,
  parseStudentFolderItemRef,
  parseStudentQuestionnaireItemRef,
  renameStudentQuestionnaireFolder,
  type StudentFolderParentOption,
} from '../utils/studentQuestionnaireFolders';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';

interface StudentFolderManagerProps {
  questionnaires: Questionnaire[];
}

interface CreateDialogItemOption {
  itemRef: string;
  type: 'folder' | 'questionnaire';
  label: string;
  subtitle: string;
  depth: number;
  disabled: boolean;
}

function toParentKey(parentId: string | null): string {
  return parentId || STUDENT_FOLDER_ROOT_KEY;
}

function parentIdToValue(parentId: string | null): string {
  return parentId || STUDENT_FOLDER_ROOT_KEY;
}

function valueToParentId(value: string): string | null {
  return value === STUDENT_FOLDER_ROOT_KEY ? null : value;
}

function withDepthLabel(option: StudentFolderParentOption): string {
  if (option.depth <= 0) {
    return option.label;
  }
  return `${'  '.repeat(Math.max(option.depth - 1, 0))}${option.label}`;
}

function getQuestionnaireTitle(questionnaire: Questionnaire, language: string): string {
  const title = questionnaire.metadata.title;
  if (typeof title === 'string') {
    return title;
  }
  return title[language] || title.en || title.ru || '';
}

export function StudentFolderManager({ questionnaires }: StudentFolderManagerProps) {
  const language =
    typeof document !== 'undefined' ? document.documentElement.lang || 'ru' : 'ru';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [state, setState] = useState<StudentQuestionnaireFoldersState>(() =>
    createDefaultStudentQuestionnaireFoldersState()
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState(t('quiz.folders.defaultName'));
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createSearch, setCreateSearch] = useState('');
  const [createSelectedItemRefs, setCreateSelectedItemRefs] = useState<string[]>([]);

  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
        .map((entry) => `${entry.id}::${(entry.systemFolders || []).join('|')}`)
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
    for (const folder of state.folders) {
      next.set(folder.id, folder);
    }
    return next;
  }, [state.folders]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      setStatus('');

      try {
        const stored = await dataAdapter.getStudentQuestionnaireFolders();
        const normalized = normalizeStudentQuestionnaireFoldersState(
          stored,
          questionnaireDescriptors
        );

        if (!active) {
          return;
        }

        setState(normalized);
        await dataAdapter.saveStudentQuestionnaireFolders(normalized);
      } catch (loadError) {
        console.error('Failed to load student folder manager state:', loadError);
        if (active) {
          setError(t('quiz.folders.error.load'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [questionnaireDescriptors, questionnaireSignature]);

  const persist = (nextState: StudentQuestionnaireFoldersState) => {
    setState(nextState);
    setError('');
    setStatus('');

    void dataAdapter.saveStudentQuestionnaireFolders(nextState).catch((saveError) => {
      console.error('Failed to persist student folder state:', saveError);
      setError(t('quiz.folders.error.save'));
    });
  };

  const openCreateDialog = (parentId: string | null) => {
    setCreateOpen(true);
    setCreateName(t('quiz.folders.defaultName'));
    setCreateParentId(parentId);
    setCreateSearch('');
    setCreateSelectedItemRefs([]);
    setError('');
    setStatus('');
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
  };

  const createParentOptions = useMemo(
    () => listStudentFolderParentOptions(state, t('quiz.folders.rootOption')),
    [state]
  );

  const createDialogItemOptions = useMemo(() => {
    const options: CreateDialogItemOption[] = [];

    const buildFolderPath = (folderId: string | null): string => {
      if (!folderId) {
        return t('quiz.folders.rootOption');
      }

      const names: string[] = [];
      let cursor = folderId;
      const visited = new Set<string>();

      while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
        visited.add(cursor);
        const folder = folderById.get(cursor);
        if (!folder) {
          break;
        }
        names.unshift(folder.name);
        cursor = folder.parentId;
      }

      return names.length > 0 ? names.join(' / ') : t('quiz.folders.rootOption');
    };

    const walk = (parentId: string | null, depth: number) => {
      const parentKey = toParentKey(parentId);
      const refs = state.itemOrderByParent[parentKey] || [];

      for (const itemRef of refs) {
        const folderId = parseStudentFolderItemRef(itemRef);
        if (folderId) {
          const folder = folderById.get(folderId);
          if (!folder) {
            continue;
          }

          if (folder.kind !== 'system') {
            const disabled =
              createParentId === folder.id ||
              isStudentFolderDescendant(state, createParentId, folder.id);

            options.push({
              itemRef,
              type: 'folder',
              label: folder.name,
              subtitle: buildFolderPath(parentId),
              depth,
              disabled,
            });
          }

          walk(folder.id, depth + 1);
          continue;
        }

        const questionnaireId = parseStudentQuestionnaireItemRef(itemRef);
        if (!questionnaireId) {
          continue;
        }

        const questionnaire = questionnaireById.get(questionnaireId);
        if (!questionnaire) {
          continue;
        }

        options.push({
          itemRef,
          type: 'questionnaire',
          label: getQuestionnaireTitle(questionnaire, language),
          subtitle: buildFolderPath(parentId),
          depth,
          disabled: false,
        });
      }
    };

    walk(null, 0);
    return options;
  }, [createParentId, folderById, language, questionnaireById, state]);

  const filteredCreateDialogOptions = useMemo(() => {
    const search = createSearch.trim().toLowerCase();
    if (!search) {
      return createDialogItemOptions;
    }

    return createDialogItemOptions.filter((option) => {
      return (
        option.label.toLowerCase().includes(search) ||
        option.subtitle.toLowerCase().includes(search)
      );
    });
  }, [createDialogItemOptions, createSearch]);

  const toggleCreateItemRef = (itemRef: string) => {
    setCreateSelectedItemRefs((prev) => {
      if (prev.includes(itemRef)) {
        return prev.filter((entry) => entry !== itemRef);
      }
      return [...prev, itemRef];
    });
  };

  const changeCreateParent = (parentId: string | null) => {
    setCreateParentId(parentId);
  };

  const submitCreateFolder = (event: React.FormEvent) => {
    event.preventDefault();

    const next = createStudentQuestionnaireFolderWithItems(state, {
      name: createName,
      parentId: createParentId,
      itemRefs: createSelectedItemRefs,
    });

    persist(next);
    setStatus(t('admin.folders.status.created'));
    closeCreateDialog();
  };

  const openRename = (folder: StudentQuestionnaireFolder) => {
    if (folder.kind === 'system') {
      return;
    }
    setRenameFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const closeRename = () => {
    setRenameFolderId(null);
    setRenameValue('');
  };

  const submitRename = (event: React.FormEvent) => {
    event.preventDefault();

    if (!renameFolderId) {
      return;
    }

    const next = renameStudentQuestionnaireFolder(state, renameFolderId, renameValue);
    if (next !== state) {
      persist(next);
      setStatus(t('admin.folders.status.renamed'));
    }
    closeRename();
  };

  const handleDeleteFolder = (folder: StudentQuestionnaireFolder) => {
    const result = deleteStudentQuestionnaireFolder(state, folder.id);

    if (result.error === 'not-empty') {
      setError(t('quiz.folders.error.deleteNotEmpty'));
      return;
    }

    if (result.error) {
      return;
    }

    persist(result.state);
    setStatus(t('admin.folders.status.deleted'));
  };

  const handleMoveItem = (itemRef: string, targetParentId: string | null) => {
    const next = moveStudentItemToParent(state, itemRef, targetParentId);
    if (next === state) {
      return;
    }

    persist(next);
    setStatus(t('admin.folders.status.moved'));
  };

  const handleMoveItemByOffset = (itemRef: string, direction: 'up' | 'down') => {
    const next = moveStudentItemByOffset(state, itemRef, direction);
    if (next === state) {
      return;
    }

    persist(next);
    setStatus(t('admin.folders.status.reordered'));
  };

  const renderMoveControls = (
    itemRef: string,
    parentId: string | null,
    parentOptions: StudentFolderParentOption[],
    options?: {
      allowParentSelection?: boolean;
      allowReorder?: boolean;
    }
  ) => {
    const allowParentSelection = options?.allowParentSelection ?? true;
    const allowReorder = options?.allowReorder ?? true;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {allowReorder && (
          <>
            <button
              type="button"
              onClick={() => handleMoveItemByOffset(itemRef, 'up')}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={t('quiz.folders.up')}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleMoveItemByOffset(itemRef, 'down')}
              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={t('quiz.folders.down')}
            >
              ↓
            </button>
          </>
        )}

        {allowParentSelection && (
          <label className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <span>{t('quiz.folders.moveTo')}</span>
            <select
              value={parentIdToValue(parentId)}
              onChange={(event) => handleMoveItem(itemRef, valueToParentId(event.target.value))}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            >
              {parentOptions.map((option) => (
                <option key={option.id || STUDENT_FOLDER_ROOT_KEY} value={parentIdToValue(option.id)}>
                  {withDepthLabel(option)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    );
  };

  const renderItem = (
    itemRef: string,
    parentId: string | null,
    depth: number
  ): JSX.Element | null => {
    const offset = `${Math.min(depth * 14, 84)}px`;

    const folderId = parseStudentFolderItemRef(itemRef);
    if (folderId) {
      const folder = folderById.get(folderId);
      if (!folder) {
        return null;
      }

      const children = state.itemOrderByParent[folder.id] || [];
      const parentOptions = listStudentFolderParentOptions(
        state,
        t('quiz.folders.rootOption'),
        folder.id
      );

      return (
        <article
          key={itemRef}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          style={{ marginLeft: offset }}
        >
          <div className="p-3 md:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                  {folder.kind === 'system' ? '🗂' : '📁'} {folder.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {folder.kind === 'system'
                    ? t('quiz.folders.systemTag')
                    : t('quiz.folders.userTag')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateDialog(folder.id)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('quiz.folders.createNested')}
                </button>
                {folder.kind !== 'system' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openRename(folder)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t('quiz.folders.rename')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder)}
                      className="px-2 py-1 rounded border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {t('quiz.folders.delete')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {folder.kind !== 'system'
              ? renderMoveControls(itemRef, parentId, parentOptions)
              : renderMoveControls(itemRef, parentId, parentOptions, {
                  allowParentSelection: false,
                  allowReorder: false,
                })}

            {children.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('quiz.folders.empty')}</p>
            ) : (
              <div className="space-y-3">
                {children.map((childRef) => renderItem(childRef, folder.id, depth + 1))}
              </div>
            )}
          </div>
        </article>
      );
    }

    const questionnaireId = parseStudentQuestionnaireItemRef(itemRef);
    if (!questionnaireId) {
      return null;
    }

    const questionnaire = questionnaireById.get(questionnaireId);
    if (!questionnaire) {
      return null;
    }

    const title = getQuestionnaireTitle(questionnaire, language);
    const runtimeId = getQuestionnaireRuntimeId(questionnaire);
    const parentOptions = listStudentFolderParentOptions(state, t('quiz.folders.rootOption'));

    return (
      <article
        key={itemRef}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40"
        style={{ marginLeft: offset }}
        data-questionnaire-id={runtimeId}
      >
        <div className="p-3 md:p-4 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {questionnaire.questions.length} {t('quiz.questions')}
            </p>
          </div>

          {renderMoveControls(itemRef, parentId, parentOptions)}
        </div>
      </article>
    );
  };

  const rootItems = state.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY] || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.folders.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.folders.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateDialog(null)}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
          >
            {t('quiz.folders.createRoot')}
          </button>
        </div>
      </header>

      {status && <p className="text-sm text-green-700 dark:text-green-400">{status}</p>}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3 md:p-4 space-y-3">
        {rootItems.map((itemRef) => renderItem(itemRef, null, 0))}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            <form onSubmit={submitCreateFolder} className="p-4 md:p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('admin.folders.create.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('admin.folders.create.subtitle')}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <span>{t('admin.folders.create.name')}</span>
                  <input
                    type="text"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <span>{t('admin.folders.create.parent')}</span>
                  <select
                    value={parentIdToValue(createParentId)}
                    onChange={(event) => changeCreateParent(valueToParentId(event.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {createParentOptions.map((option) => (
                      <option
                        key={option.id || STUDENT_FOLDER_ROOT_KEY}
                        value={parentIdToValue(option.id)}
                      >
                        {withDepthLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                <span>{t('admin.folders.create.search')}</span>
                <input
                  type="text"
                  value={createSearch}
                  onChange={(event) => setCreateSearch(event.target.value)}
                  placeholder={t('admin.folders.create.searchPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('admin.folders.create.items')}
                </p>

                <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCreateDialogOptions.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('admin.folders.create.noItems')}
                    </p>
                  ) : (
                    filteredCreateDialogOptions.map((option) => {
                      const selected = createSelectedItemRefs.includes(option.itemRef);

                      return (
                        <label
                          key={option.itemRef}
                          className={`flex items-start gap-3 p-3 ${
                            option.disabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                          style={{ paddingLeft: `${option.depth * 14 + 12}px` }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={option.disabled}
                            onChange={() => toggleCreateItemRef(option.itemRef)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm text-gray-900 dark:text-gray-100">
                              {option.type === 'folder' ? '📁' : '📝'} {option.label}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {option.subtitle}
                            </span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeCreateDialog}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm text-white"
                >
                  {t('admin.folders.create.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renameFolderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            <form onSubmit={submitRename} className="p-4 md:p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('admin.folders.rename.title')}
              </h3>

              <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                <span>{t('admin.folders.rename.name')}</span>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                />
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeRename}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm text-white"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
