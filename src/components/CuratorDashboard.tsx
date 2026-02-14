import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CuratorFeedback,
  CuratorResultFolder,
  Questionnaire,
  QuizResult,
  ReviewStatus,
} from '../types/questionnaire';
import { useResults } from '../hooks/useResults';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { useUser } from '../hooks/useUser';
import { dataAdapter } from '../services/localStorageAdapter';
import { exportResults } from '../utils/exportUtils';
import { getGradeDescription, getLanguage, t } from '../utils/i18n';
import { getQuestionnaireRuntimeId } from '../utils/questionnaireIdentity';
import { MarkdownContent } from './ui/MarkdownContent';
import { MarkdownEditor } from './ui/MarkdownEditor';
import { hasMarkdownContent, mergeLegacyCommentWithPhotos } from '../utils/markdown';
import {
  CURATOR_FOLDER_ROOT_KEY,
  assignCuratorStudentToFolder,
  createCuratorFolderItemRef,
  createCuratorResultFolderWithId,
  createDefaultCuratorResultFoldersState,
  deleteCuratorResultFolder,
  isCuratorFolderDescendant,
  listCuratorFolderParentOptions,
  moveCuratorItemToParent,
  normalizeCuratorResultFoldersState,
  normalizeCuratorStudentKey,
  parseCuratorFolderItemRef,
  parseCuratorStudentItemRef,
  renameCuratorResultFolder,
  type CuratorFolderParentOption,
  type CuratorStudentDescriptor,
} from '../utils/curatorResultFolders';
import { parseResultsTransferPayload } from '../utils/resultsTransfer';

interface FeedbackTarget {
  resultId: string;
  questionId: string;
}

interface CuratorResultGroup {
  groupId: string;
  studentKey: string;
  folderId: string | null;
  questionnaireId: string;
  questionnaireTitle: string;
  userName: string;
  results: QuizResult[];
  pendingCount: number;
  reviewedCount: number;
  totalCount: number;
  lastCompletedAt: number;
}

interface CuratorStudentGroup {
  studentKey: string;
  userName: string;
  folderId: string | null;
  groups: CuratorResultGroup[];
  pendingCount: number;
  reviewedCount: number;
  totalCount: number;
  lastCompletedAt: number;
}

interface ImportAssignmentRow {
  studentKey: string;
  studentName: string;
  mode: 'existing' | 'new';
  folderId: string | null;
  newFolderName: string;
}

interface FolderAggregate {
  studentsCount: number;
  pendingCount: number;
}

interface CreateDialogItemOption {
  itemRef: string;
  type: 'folder' | 'student';
  label: string;
  subtitle: string;
  depth: number;
  disabled: boolean;
}

function isPendingStatus(status: ReviewStatus): boolean {
  return status === 'pending' || status === 'in_review';
}

function isReviewedStatus(status: ReviewStatus): boolean {
  return status === 'reviewed' || status === 'needs_revision' || status === 'approved';
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

function toParentKey(parentId: string | null): string {
  return parentId || CURATOR_FOLDER_ROOT_KEY;
}

function parentIdToOptionValue(parentId: string | null): string {
  return parentId || CURATOR_FOLDER_ROOT_KEY;
}

function optionValueToParentId(value: string): string | null {
  return value === CURATOR_FOLDER_ROOT_KEY ? null : value;
}

function folderOptionLabel(option: CuratorFolderParentOption): string {
  if (option.depth <= 0) {
    return option.label;
  }

  return `${'  '.repeat(Math.max(option.depth - 1, 0))}${option.label}`;
}

function isFolderInBranch(
  folderById: ReadonlyMap<string, CuratorResultFolder>,
  folderId: string | null,
  ancestorFolderId: string | null
): boolean {
  if (!ancestorFolderId) {
    return true;
  }

  let cursor = folderId;
  const visited = new Set<string>();

  while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
    if (cursor === ancestorFolderId) {
      return true;
    }

    visited.add(cursor);
    cursor = folderById.get(cursor)?.parentId || null;
  }

  return false;
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

  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folderError, setFolderError] = useState('');
  const [folderState, setFolderState] = useState(createDefaultCuratorResultFoldersState());
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({});
  const [resultsViewMode, setResultsViewMode] = useState<'tree' | 'tiles'>('tree');
  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({});
  const [expandedWorkGroupIds, setExpandedWorkGroupIds] = useState<Record<string, boolean>>({});

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState(t('quiz.folders.defaultName'));
  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null);
  const [createFolderSearch, setCreateFolderSearch] = useState('');
  const [createFolderSelectedItemRefs, setCreateFolderSelectedItemRefs] = useState<string[]>([]);

  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');

  const [importAssignmentOpen, setImportAssignmentOpen] = useState(false);
  const [importAssignments, setImportAssignments] = useState<ImportAssignmentRow[]>([]);

  const curatorName = user?.name || t('header.role.curator');
  const language = getLanguage();

  const folderById = useMemo(() => {
    const next = new Map<string, CuratorResultFolder>();
    for (const folder of folderState.folders) {
      next.set(folder.id, folder);
    }
    return next;
  }, [folderState.folders]);

  const studentDescriptors = useMemo<CuratorStudentDescriptor[]>(() => {
    const byKey = new Map<string, string>();

    for (const result of results) {
      const studentName = result.userName.trim();
      const studentKey = normalizeCuratorStudentKey(studentName);
      if (!studentKey || byKey.has(studentKey)) {
        continue;
      }
      byKey.set(studentKey, studentName || result.userName || studentKey);
    }

    return Array.from(byKey.entries()).map(([key, name]) => ({ key, name }));
  }, [results]);

  const studentDescriptorSignature = useMemo(
    () => studentDescriptors.map((entry) => `${entry.key}:${entry.name}`).join('\u0001'),
    [studentDescriptors]
  );

  const studentNameByKey = useMemo(() => {
    return new Map(studentDescriptors.map((entry) => [entry.key, entry.name]));
  }, [studentDescriptors]);

  useEffect(() => {
    let active = true;

    const loadFolders = async () => {
      setFoldersLoading(true);
      setFolderError('');

      try {
        const stored = await dataAdapter.getCuratorResultFolders();
        const normalized = normalizeCuratorResultFoldersState(stored, studentDescriptors);
        if (!active) {
          return;
        }

        setFolderState(normalized);
        await dataAdapter.saveCuratorResultFolders(normalized);
      } catch (error) {
        console.error('Failed to load curator folder state:', error);
        if (active) {
          setFolderError(t('curator.folder.error.load'));
        }
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
  }, [studentDescriptorSignature, studentDescriptors]);

  useEffect(() => {
    if (activeFolderId && !folderById.has(activeFolderId)) {
      setActiveFolderId(null);
    }
  }, [activeFolderId, folderById]);

  const persistFolders = (next: typeof folderState) => {
    setFolderState(next);
    setFolderError('');

    void dataAdapter.saveCuratorResultFolders(next).catch((error) => {
      console.error('Failed to save curator folder state:', error);
      setFolderError(t('curator.folder.error.save'));
    });
  };

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

  const groupedResults = useMemo<CuratorResultGroup[]>(() => {
    const groupMap = new Map<string, CuratorResultGroup>();

    for (const result of results) {
      const studentKey = normalizeCuratorStudentKey(result.userName);
      const groupId = `${result.questionnaireId}::${studentKey}`;
      const current = groupMap.get(groupId);

      const assignedFolderId = folderState.studentFolderByKey[studentKey] || null;
      const safeFolderId = assignedFolderId && folderById.has(assignedFolderId) ? assignedFolderId : null;

      if (!current) {
        groupMap.set(groupId, {
          groupId,
          studentKey,
          folderId: safeFolderId,
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
  }, [folderById, folderState.studentFolderByKey, results]);

  const folderAggregates = useMemo(() => {
    const studentSetByFolder = new Map<string, Set<string>>();
    const pendingByFolder = new Map<string, number>();

    const addToFolder = (folderKey: string, studentKey: string, pending: number) => {
      const students = studentSetByFolder.get(folderKey) || new Set<string>();
      students.add(studentKey);
      studentSetByFolder.set(folderKey, students);
      pendingByFolder.set(folderKey, (pendingByFolder.get(folderKey) || 0) + pending);
    };

    for (const group of groupedResults) {
      addToFolder(CURATOR_FOLDER_ROOT_KEY, group.studentKey, group.pendingCount);

      let cursor = group.folderId;
      const visited = new Set<string>();
      while (cursor && folderById.has(cursor) && !visited.has(cursor)) {
        visited.add(cursor);
        addToFolder(cursor, group.studentKey, group.pendingCount);
        cursor = folderById.get(cursor)?.parentId || null;
      }
    }

    const next = new Map<string, FolderAggregate>();
    const keys = new Set<string>([
      CURATOR_FOLDER_ROOT_KEY,
      ...Array.from(folderById.keys()),
      ...Array.from(studentSetByFolder.keys()),
    ]);

    for (const key of keys) {
      next.set(key, {
        studentsCount: (studentSetByFolder.get(key) || new Set()).size,
        pendingCount: pendingByFolder.get(key) || 0,
      });
    }

    return next;
  }, [folderById, groupedResults]);

  const visibleGroups = useMemo(() => {
    return groupedResults.filter((group) =>
      isFolderInBranch(folderById, group.folderId, activeFolderId)
    );
  }, [activeFolderId, folderById, groupedResults]);

  const pendingResults = visibleGroups.flatMap((group) =>
    group.results.filter((result) => isPendingStatus(result.reviewStatus))
  );
  const reviewedResults = visibleGroups.flatMap((group) =>
    group.results.filter((result) => isReviewedStatus(result.reviewStatus))
  );

  const visibleStudentGroups = useMemo<CuratorStudentGroup[]>(() => {
    const byStudent = new Map<string, CuratorStudentGroup>();

    for (const group of visibleGroups) {
      const current = byStudent.get(group.studentKey);
      if (!current) {
        byStudent.set(group.studentKey, {
          studentKey: group.studentKey,
          userName: group.userName,
          folderId: group.folderId,
          groups: [group],
          pendingCount: group.pendingCount,
          reviewedCount: group.reviewedCount,
          totalCount: group.totalCount,
          lastCompletedAt: group.lastCompletedAt,
        });
        continue;
      }

      current.groups.push(group);
      current.pendingCount += group.pendingCount;
      current.reviewedCount += group.reviewedCount;
      current.totalCount += group.totalCount;
      current.lastCompletedAt = Math.max(current.lastCompletedAt, group.lastCompletedAt);
      if (!current.folderId && group.folderId) {
        current.folderId = group.folderId;
      }
    }

    const items = Array.from(byStudent.values());
    for (const item of items) {
      item.groups.sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
    }

    return items.sort((a, b) => b.lastCompletedAt - a.lastCompletedAt);
  }, [visibleGroups]);

  const activeStudentGroups = visibleStudentGroups.filter((group) => group.pendingCount > 0);
  const completedStudentGroups = visibleStudentGroups.filter(
    (group) => group.pendingCount === 0 && group.reviewedCount > 0
  );

  const parentOptions = useMemo(
    () => listCuratorFolderParentOptions(folderState, t('curator.folder.rootOption')),
    [folderState]
  );

  const folderOptionsOnly = useMemo(
    () => parentOptions.filter((option) => option.id !== null),
    [parentOptions]
  );

  const rootAggregate = folderAggregates.get(CURATOR_FOLDER_ROOT_KEY) || {
    studentsCount: 0,
    pendingCount: 0,
  };

  const createDialogItemOptions = useMemo(() => {
    const options: CreateDialogItemOption[] = [];

    const buildFolderPath = (folderId: string | null): string => {
      if (!folderId) {
        return t('curator.folder.rootOption');
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

      return names.length > 0 ? names.join(' / ') : t('curator.folder.rootOption');
    };

    const walk = (parentId: string | null, depth: number) => {
      const parentKey = toParentKey(parentId);
      const refs = folderState.itemOrderByParent[parentKey] || [];

      for (const itemRef of refs) {
        const folderId = parseCuratorFolderItemRef(itemRef);
        if (folderId) {
          const folder = folderById.get(folderId);
          if (!folder) {
            continue;
          }

          const disabled =
            createFolderParentId === folder.id ||
            isCuratorFolderDescendant(folderState, createFolderParentId, folder.id);

          options.push({
            itemRef,
            type: 'folder',
            label: folder.name,
            subtitle: buildFolderPath(parentId),
            depth,
            disabled,
          });

          walk(folder.id, depth + 1);
          continue;
        }

        const studentKey = parseCuratorStudentItemRef(itemRef);
        if (!studentKey) {
          continue;
        }

        options.push({
          itemRef,
          type: 'student',
          label: studentNameByKey.get(studentKey) || studentKey,
          subtitle: buildFolderPath(parentId),
          depth,
          disabled: false,
        });
      }
    };

    walk(null, 0);
    return options;
  }, [createFolderParentId, folderById, folderState, studentNameByKey]);

  const filteredCreateDialogOptions = useMemo(() => {
    const search = createFolderSearch.trim().toLowerCase();
    if (!search) {
      return createDialogItemOptions;
    }

    return createDialogItemOptions.filter((option) => {
      return (
        option.label.toLowerCase().includes(search) ||
        option.subtitle.toLowerCase().includes(search)
      );
    });
  }, [createDialogItemOptions, createFolderSearch]);

  useEffect(() => {
    if (!createFolderOpen) {
      return;
    }

    const disabled = new Set(
      createDialogItemOptions
        .filter((option) => option.disabled)
        .map((option) => option.itemRef)
    );
    setCreateFolderSelectedItemRefs((prev) =>
      prev.filter((itemRef) => !disabled.has(itemRef))
    );
  }, [createDialogItemOptions, createFolderOpen]);

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

  const handleAssignStudentFolder = (studentKey: string, targetFolderId: string | null) => {
    const next = assignCuratorStudentToFolder(folderState, studentKey, targetFolderId);
    persistFolders(next);
  };

  const openCreateFolderDialog = (parentId: string | null) => {
    setCreateFolderOpen(true);
    setCreateFolderName(t('quiz.folders.defaultName'));
    setCreateFolderParentId(parentId);
    setCreateFolderSearch('');
    setCreateFolderSelectedItemRefs([]);
  };

  const toggleCreateFolderItemRef = (itemRef: string) => {
    setCreateFolderSelectedItemRefs((prev) => {
      if (prev.includes(itemRef)) {
        return prev.filter((entry) => entry !== itemRef);
      }
      return [...prev, itemRef];
    });
  };

  const submitCreateFolder = (event: React.FormEvent) => {
    event.preventDefault();

    const created = createCuratorResultFolderWithId(
      folderState,
      createFolderName,
      createFolderParentId
    );

    let next = created.state;
    if (created.folderId) {
      const createdFolderRef = createCuratorFolderItemRef(created.folderId);
      const selected = Array.from(new Set(createFolderSelectedItemRefs)).filter(
        (itemRef) => itemRef && itemRef !== createdFolderRef
      );

      for (const itemRef of selected) {
        next = moveCuratorItemToParent(next, itemRef, created.folderId);
      }
    }

    persistFolders(next);
    setCreateFolderOpen(false);
  };

  const openRenameFolderDialog = (folder: CuratorResultFolder) => {
    setRenameFolderId(folder.id);
    setRenameFolderName(folder.name);
  };

  const submitRenameFolder = (event: React.FormEvent) => {
    event.preventDefault();

    if (!renameFolderId) {
      return;
    }

    const next = renameCuratorResultFolder(folderState, renameFolderId, renameFolderName);
    persistFolders(next);
    setRenameFolderId(null);
    setRenameFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    const result = deleteCuratorResultFolder(folderState, folderId);
    if (result.error === 'not-empty') {
      setFolderError(t('curator.folder.error.deleteNotEmpty'));
      return;
    }
    if (result.error) {
      return;
    }

    persistFolders(result.state);
  };

  const handleMoveFolder = (folderId: string, parentId: string | null) => {
    const itemRef = createCuratorFolderItemRef(folderId);
    const next = moveCuratorItemToParent(folderState, itemRef, parentId);
    if (next === folderState) {
      return;
    }

    persistFolders(next);
  };

  const handleExportGroupForStudent = (group: CuratorResultGroup) => {
    setOpsError('');
    setOpsMessage('');

    const reviewedGroupResults = group.results.filter((result) => isReviewedStatus(result.reviewStatus));

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

  const handleExportReviewedForStudent = (studentGroup: CuratorStudentGroup) => {
    setOpsError('');
    setOpsMessage('');

    const reviewedStudentResults = studentGroup.groups.flatMap((group) =>
      group.results.filter((result) => isReviewedStatus(result.reviewStatus))
    );

    if (reviewedStudentResults.length === 0) {
      setOpsError(
        t('curator.error.groupNoReviewed', {
          group: studentGroup.userName,
        })
      );
      return;
    }

    const fileName = `curator-transfer-${sanitizeFilenamePart(studentGroup.userName)}-${Date.now()}.json`;
    exportResults(reviewedStudentResults, 'json', fileName);
    setOpsMessage(
      t('curator.message.exportGroup', {
        count: reviewedStudentResults.length,
        userName: studentGroup.userName,
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setOpsError('');
    setOpsMessage('');

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = parseResultsTransferPayload(content);
      if (parsed.totalRaw === 0) {
        throw new Error(t('curator.error.import'));
      }

      const knownBefore = new Set(results.map((result) => normalizeCuratorStudentKey(result.userName)));
      const unknownStudentByKey = new Map<string, string>();
      for (const result of parsed.valid) {
        const studentName = result.userName.trim();
        const studentKey = normalizeCuratorStudentKey(studentName);
        if (!studentKey || knownBefore.has(studentKey)) {
          continue;
        }

        if (!unknownStudentByKey.has(studentKey)) {
          unknownStudentByKey.set(studentKey, studentName || result.userName || studentKey);
        }
      }

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

      if (folderState.folders.length > 0 && unknownStudentByKey.size > 0) {
        const defaultFolderId = folderState.folders[0]?.id || null;
        const rows: ImportAssignmentRow[] = Array.from(unknownStudentByKey.entries()).map(
          ([studentKey, studentName]) => ({
            studentKey,
            studentName,
            mode: 'existing',
            folderId: defaultFolderId,
            newFolderName: `${studentName}`,
          })
        );

        setImportAssignments(rows);
        setImportAssignmentOpen(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('curator.error.import');
      setOpsError(message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const applyImportAssignments = () => {
    let next = folderState;

    for (const assignment of importAssignments) {
      let targetFolderId = assignment.folderId;

      if (assignment.mode === 'new') {
        const created = createCuratorResultFolderWithId(next, assignment.newFolderName, null);
        next = created.state;
        targetFolderId = created.folderId;
      }

      next = assignCuratorStudentToFolder(next, assignment.studentKey, targetFolderId || null);
    }

    persistFolders(next);
    setImportAssignmentOpen(false);
    setImportAssignments([]);

    setOpsMessage(
      t('curator.message.assignmentApplied', {
        count: importAssignments.length,
      })
    );
  };

  const renderFolderTree = (parentId: string | null, depth: number): JSX.Element[] => {
    const parentKey = toParentKey(parentId);
    const items = folderState.itemOrderByParent[parentKey] || [];

    return items.flatMap((itemRef) => {
      const folderId = parseCuratorFolderItemRef(itemRef);
      if (!folderId) {
        return [];
      }

      const folder = folderById.get(folderId);
      if (!folder) {
        return [];
      }

      const childHasFolder = (folderState.itemOrderByParent[folder.id] || []).some((ref) =>
        Boolean(parseCuratorFolderItemRef(ref))
      );
      const expanded = expandedFolderIds[folder.id] ?? depth < 1;
      const aggregate = folderAggregates.get(folder.id) || {
        studentsCount: 0,
        pendingCount: 0,
      };
      const selected = activeFolderId === folder.id;

      const moveOptions = listCuratorFolderParentOptions(
        folderState,
        t('curator.folder.rootOption'),
        folder.id
      );

      return [
        <div key={folder.id} className="space-y-2">
          <div
            className={`rounded-lg border p-3 ${
              selected
                ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20 dark:border-primary-700'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
            }`}
            style={{ marginLeft: `${depth * 14}px` }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!childHasFolder) {
                      return;
                    }
                    setExpandedFolderIds((prev) => ({
                      ...prev,
                      [folder.id]: !(prev[folder.id] ?? depth < 1),
                    }));
                  }}
                  className="w-8 h-8 text-lg font-semibold leading-none text-gray-500 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  disabled={!childHasFolder}
                >
                  {childHasFolder ? (expanded ? '▾' : '▸') : '•'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className="text-left text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  📁 {folder.name}
                </button>
                <span className="text-xs rounded border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300">
                  {t('curator.folder.studentsCount', { count: aggregate.studentsCount })}
                </span>
                <span className="text-xs rounded border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                  {t('curator.folder.pendingCount', { count: aggregate.pendingCount })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateFolderDialog(folder.id)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('quiz.folders.createNested')}
                </button>
                <button
                  type="button"
                  onClick={() => openRenameFolderDialog(folder)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {t('quiz.folders.rename')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="px-2 py-1 rounded border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t('quiz.folders.delete')}
                </button>
                <select
                  value={parentIdToOptionValue(folder.parentId)}
                  onChange={(event) => handleMoveFolder(folder.id, optionValueToParentId(event.target.value))}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                >
                  {moveOptions.map((option) => (
                    <option key={option.id || CURATOR_FOLDER_ROOT_KEY} value={parentIdToOptionValue(option.id)}>
                      {folderOptionLabel(option)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {expanded && renderFolderTree(folder.id, depth + 1)}
        </div>,
      ];
    });
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
              <p className="text-sm text-gray-600 dark:text-gray-400">{result.questionnaireTitle}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(result.completedAt).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg md:text-xl font-bold text-primary-600">{result.percentage}%</span>
              <button
                type="button"
                onClick={() => {
                  void handleToggleResult(result);
                }}
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
                  onClick={() => {
                    void updateReviewStatus(result, 'reviewed');
                  }}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  {t('curator.actions.markReviewed')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void updateReviewStatus(result, 'needs_revision');
                  }}
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
                  feedbackTarget?.resultId === result.id && feedbackTarget?.questionId === questionId;
                const schemaQuestion = schemaLookup?.get(questionId);
                const questionIndex = schemaQuestion?.index ?? index;
                const questionTitle = schemaQuestion?.title || questionId;
                const studentCommentMarkdown = mergeLegacyCommentWithPhotos(
                  details.comment || '',
                  details.photos || []
                );
                const hasStudentComment = hasMarkdownContent(studentCommentMarkdown);

                return (
                  <div key={questionId} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 md:p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('curator.question.label', { index: questionIndex + 1 })}
                      </span>
                      <span className="text-sm text-gray-800 dark:text-gray-100">{questionTitle}</span>
                      <span className="font-bold text-primary-600">{details.score}/10</span>
                      <span className="text-xs text-gray-500">{getGradeDescription(details.score)}</span>
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
                              onClick={() => {
                                void saveFeedback(result, questionId, feedbackText, true);
                              }}
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

  const renderWorkGroup = (group: CuratorResultGroup, compact = false): JSX.Element => {
    const expanded = Boolean(expandedWorkGroupIds[group.groupId]);
    const cardClassName = compact
      ? 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow'
      : 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';

    return (
      <article key={group.groupId} className={cardClassName}>
        <div className={compact ? 'p-4 md:p-5 space-y-3' : 'p-3 md:p-4 space-y-3'}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                {group.questionnaireTitle}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{group.userName}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('curator.group.summary', {
                  total: group.totalCount,
                  pending: group.pendingCount,
                  reviewed: group.reviewedCount,
                })}
              </p>
            </div>

            <span className="text-lg md:text-xl font-bold text-primary-600">
              {group.results[0]?.percentage ?? 0}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setExpandedWorkGroupIds((prev) => ({
                  ...prev,
                  [group.groupId]: !prev[group.groupId],
                }))
              }
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
            >
              {expanded ? t('curator.actions.hide') : t('curator.actions.review')}
            </button>
            <button
              type="button"
              onClick={() => handleExportGroupForStudent(group)}
              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              {t('curator.ops.exportForStudent')}
            </button>
          </div>
        </div>

        {expanded && <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-3">{group.results.map((result) => renderResultCard(result))}</div>}
      </article>
    );
  };

  const renderStudentGroup = (group: CuratorStudentGroup): JSX.Element => {
    const studentExpanded = expandedStudentIds[group.studentKey] ?? true;

    return (
      <article
        key={group.studentKey}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-5 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            {resultsViewMode === 'tree' && (
              <button
                type="button"
                onClick={() =>
                  setExpandedStudentIds((prev) => ({
                    ...prev,
                    [group.studentKey]: !(prev[group.studentKey] ?? true),
                  }))
                }
                className="w-8 h-8 text-xl font-semibold leading-none text-gray-500 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {studentExpanded ? '▾' : '▸'}
              </button>
            )}

            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                👤 {group.userName}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {t('curator.group.summary', {
                  total: group.totalCount,
                  pending: group.pendingCount,
                  reviewed: group.reviewedCount,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <span>{t('curator.group.folderAssign')}</span>
              <select
                value={parentIdToOptionValue(group.folderId)}
                onChange={(event) =>
                  handleAssignStudentFolder(group.studentKey, optionValueToParentId(event.target.value))
                }
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              >
                {parentOptions.map((option) => (
                  <option key={option.id || CURATOR_FOLDER_ROOT_KEY} value={parentIdToOptionValue(option.id)}>
                    {folderOptionLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => handleExportReviewedForStudent(group)}
              className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              {t('curator.ops.exportForStudent')}
            </button>
          </div>
        </div>

        {resultsViewMode === 'tree' && studentExpanded && (
          <div className="pl-3 border-l border-gray-200 dark:border-gray-700 space-y-3">
            {group.groups.map((workGroup) => renderWorkGroup(workGroup))}
          </div>
        )}

        {resultsViewMode === 'tiles' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.groups.map((workGroup) => renderWorkGroup(workGroup, true))}
          </div>
        )}
      </article>
    );
  };

  if (loading || foldersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-4 md:mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('curator.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">{t('curator.subtitle')}</p>
      </div>

      <section className="mb-5 md:mb-6 overflow-x-auto pb-1">
        <div className="min-w-[760px] grid grid-cols-5 gap-2.5 md:gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 md:p-3.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              {t('curator.metrics.totalAnswers')}
            </p>
            <p className="text-lg md:text-xl font-bold leading-tight text-gray-900 dark:text-white">
              {visibleGroups.reduce((sum, group) => sum + group.totalCount, 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-3.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              {t('curator.metrics.groupCount')}
            </p>
            <p className="text-lg md:text-xl font-bold leading-tight text-gray-900 dark:text-white">
              {visibleGroups.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-3.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">{t('curator.metrics.pending')}</p>
            <p className="text-lg md:text-xl font-bold leading-tight text-yellow-600">{pendingResults.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-3.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              {t('curator.metrics.reviewed')}
            </p>
            <p className="text-lg md:text-xl font-bold leading-tight text-green-600">{reviewedResults.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 md:p-3.5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] md:text-xs text-gray-500 dark:text-gray-400">
              {t('curator.metrics.averageScore')}
            </p>
            <p className="text-lg md:text-xl font-bold leading-tight text-primary-600">
              {visibleGroups.length > 0
                ? Math.round(
                    visibleGroups
                      .flatMap((group) => group.results)
                      .reduce((sum, item) => sum + item.percentage, 0) /
                      Math.max(visibleGroups.flatMap((group) => group.results).length, 1)
                  )
                : 0}
              %
            </p>
          </div>
        </div>
      </section>

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

        {opsMessage && <p className="text-sm text-green-700 dark:text-green-400">{opsMessage}</p>}
        {opsError && <p className="text-sm text-red-700 dark:text-red-400">{opsError}</p>}
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
              {t('curator.folder.title')}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {t('curator.folder.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => openCreateFolderDialog(null)}
            className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm"
          >
            {t('quiz.folders.createRoot')}
          </button>
        </div>

        {folderError && <p className="text-sm text-red-700 dark:text-red-400">{folderError}</p>}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            className={`w-full text-left rounded-lg border p-3 ${
              activeFolderId === null
                ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/20 dark:border-primary-700'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                🧭 {t('curator.folder.rootOption')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs rounded border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300">
                  {t('curator.folder.studentsCount', { count: rootAggregate.studentsCount })}
                </span>
                <span className="text-xs rounded border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                  {t('curator.folder.pendingCount', { count: rootAggregate.pendingCount })}
                </span>
              </div>
            </div>
          </button>

          {renderFolderTree(null, 0)}
        </div>
      </section>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              {t('curator.section.activeGroups', { count: activeStudentGroups.length })}
            </h2>

            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
              <button
                type="button"
                onClick={() => setResultsViewMode('tree')}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-md transition-colors ${
                  resultsViewMode === 'tree'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t('quiz.folders.view.tree')}
              </button>
              <button
                type="button"
                onClick={() => setResultsViewMode('tiles')}
                className={`px-3 py-1.5 text-xs md:text-sm rounded-md transition-colors ${
                  resultsViewMode === 'tiles'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t('quiz.folders.view.tiles')}
              </button>
            </div>
          </div>

          {activeStudentGroups.length === 0 ? (
            <div className="text-center py-8 md:py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">{t('curator.empty.activeGroups')}</p>
            </div>
          ) : (
            activeStudentGroups.map((group) => renderStudentGroup(group))
          )}
        </section>

        {completedStudentGroups.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
              {t('curator.section.completedGroups', { count: completedStudentGroups.length })}
            </h2>

            {completedStudentGroups.map((group) => renderStudentGroup(group))}
          </section>
        )}
      </div>

      {createFolderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            <form onSubmit={submitCreateFolder} className="p-4 md:p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('curator.folder.create.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('curator.folder.create.subtitle')}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                  <span>{t('curator.folder.create.name')}</span>
                  <input
                    type="text"
                    value={createFolderName}
                    onChange={(event) => setCreateFolderName(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                  <span>{t('curator.folder.create.parent')}</span>
                  <select
                    value={parentIdToOptionValue(createFolderParentId)}
                    onChange={(event) =>
                      setCreateFolderParentId(optionValueToParentId(event.target.value))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {parentOptions.map((option) => (
                      <option
                        key={option.id || CURATOR_FOLDER_ROOT_KEY}
                        value={parentIdToOptionValue(option.id)}
                      >
                        {folderOptionLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                <span>{t('curator.folder.create.search')}</span>
                <input
                  type="text"
                  value={createFolderSearch}
                  onChange={(event) => setCreateFolderSearch(event.target.value)}
                  placeholder={t('curator.folder.create.searchPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('curator.folder.create.items')}
                </p>
                <div className="max-h-72 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredCreateDialogOptions.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                      {t('curator.folder.create.noItems')}
                    </p>
                  ) : (
                    filteredCreateDialogOptions.map((option) => {
                      const selected = createFolderSelectedItemRefs.includes(option.itemRef);

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
                            onChange={() => toggleCreateFolderItemRef(option.itemRef)}
                            className="mt-0.5"
                          />
                          <span>
                            <span className="block text-sm text-gray-900 dark:text-gray-100">
                              {option.type === 'folder' ? '📁' : '👤'} {option.label}
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
                  onClick={() => {
                    setCreateFolderOpen(false);
                    setCreateFolderSearch('');
                    setCreateFolderSelectedItemRefs([]);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm text-white"
                >
                  {t('curator.folder.create.confirm')}
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
            <form onSubmit={submitRenameFolder} className="p-4 md:p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('curator.folder.rename.title')}
              </h3>

              <label className="space-y-1 text-sm text-gray-700 dark:text-gray-300 block">
                <span>{t('curator.folder.rename.name')}</span>
                <input
                  type="text"
                  value={renameFolderName}
                  onChange={(event) => setRenameFolderName(event.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  required
                />
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRenameFolderId(null);
                    setRenameFolderName('');
                  }}
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

      {importAssignmentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            <div className="p-4 md:p-5 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('curator.import.assignment.title')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('curator.import.assignment.subtitle')}
                </p>
              </div>

              <div className="space-y-3 max-h-80 overflow-auto">
                {importAssignments.map((row) => (
                  <div
                    key={row.studentKey}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.studentName}</p>

                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-xs text-gray-600 dark:text-gray-300 block">
                        <span>{t('curator.import.assignment.mode')}</span>
                        <select
                          value={row.mode}
                          onChange={(event) => {
                            const value = event.target.value === 'new' ? 'new' : 'existing';
                            setImportAssignments((prev) =>
                              prev.map((entry) =>
                                entry.studentKey === row.studentKey
                                  ? {
                                      ...entry,
                                      mode: value,
                                    }
                                  : entry
                              )
                            );
                          }}
                          className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                          <option value="existing">{t('curator.import.assignment.modeExisting')}</option>
                          <option value="new">{t('curator.import.assignment.modeNew')}</option>
                        </select>
                      </label>

                      {row.mode === 'existing' ? (
                        <label className="space-y-1 text-xs text-gray-600 dark:text-gray-300 block">
                          <span>{t('curator.import.assignment.folder')}</span>
                          <select
                            value={parentIdToOptionValue(row.folderId)}
                            onChange={(event) => {
                              const folderId = optionValueToParentId(event.target.value);
                              setImportAssignments((prev) =>
                                prev.map((entry) =>
                                  entry.studentKey === row.studentKey
                                    ? {
                                        ...entry,
                                        folderId,
                                      }
                                    : entry
                                )
                              );
                            }}
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          >
                            <option value={CURATOR_FOLDER_ROOT_KEY}>{t('curator.folder.rootOption')}</option>
                            {folderOptionsOnly.map((option) => (
                              <option key={option.id || CURATOR_FOLDER_ROOT_KEY} value={parentIdToOptionValue(option.id)}>
                                {folderOptionLabel(option)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="space-y-1 text-xs text-gray-600 dark:text-gray-300 block">
                          <span>{t('curator.import.assignment.newFolderName')}</span>
                          <input
                            type="text"
                            value={row.newFolderName}
                            onChange={(event) => {
                              const value = event.target.value;
                              setImportAssignments((prev) =>
                                prev.map((entry) =>
                                  entry.studentKey === row.studentKey
                                    ? {
                                        ...entry,
                                        newFolderName: value,
                                      }
                                    : entry
                                )
                              );
                            }}
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setImportAssignmentOpen(false);
                    setImportAssignments([]);
                  }}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={applyImportAssignments}
                  className="px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-sm text-white"
                >
                  {t('curator.import.assignment.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
