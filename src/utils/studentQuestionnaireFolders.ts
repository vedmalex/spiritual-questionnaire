import type {
  StudentQuestionnaireFolder,
  StudentQuestionnaireFoldersState,
} from '../types/questionnaire';

export interface StudentQuestionnaireDescriptor {
  id: string;
  systemFolders?: readonly string[];
}

export const STUDENT_FOLDER_ROOT_KEY = '__root__';
const FOLDER_ITEM_PREFIX = 'folder:';
const QUESTIONNAIRE_ITEM_PREFIX = 'quiz:';
const DEFAULT_FOLDER_NAME = 'Новая папка';
const SYSTEM_FOLDER_ID_PREFIX = 'system-folder-';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function trimToNonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeFolderName(name: string, fallbackIndex: number): string {
  const trimmed = name.trim();
  if (trimmed.length > 0) {
    return trimmed.slice(0, 120);
  }
  return `${DEFAULT_FOLDER_NAME} ${fallbackIndex}`;
}

function toParentKey(parentId: string | null): string {
  return parentId || STUDENT_FOLDER_ROOT_KEY;
}

function toSystemFolderId(pathKey: string): string {
  return `${SYSTEM_FOLDER_ID_PREFIX}${encodeURIComponent(pathKey)}`;
}

function parseSystemFolderPath(rawPath: string): string[] {
  const normalized = rawPath.replace(/\\/g, '/');
  return normalized
    .split('/')
    .flatMap((segment) => segment.split('>'))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeQuestionnaireDescriptors(
  questionnaires: readonly string[] | readonly StudentQuestionnaireDescriptor[]
): StudentQuestionnaireDescriptor[] {
  const seenIds = new Set<string>();
  const next: StudentQuestionnaireDescriptor[] = [];

  for (const rawEntry of questionnaires) {
    const id =
      typeof rawEntry === 'string'
        ? trimToNonEmpty(rawEntry)
        : trimToNonEmpty(rawEntry?.id);
    if (!id || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);

    const systemFolders =
      typeof rawEntry === 'string' || !Array.isArray(rawEntry.systemFolders)
        ? undefined
        : rawEntry.systemFolders
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);

    next.push({
      id,
      systemFolders,
    });
  }

  return next;
}

export function createStudentFolderItemRef(folderId: string): string {
  return `${FOLDER_ITEM_PREFIX}${folderId}`;
}

export function createStudentQuestionnaireItemRef(questionnaireId: string): string {
  return `${QUESTIONNAIRE_ITEM_PREFIX}${questionnaireId}`;
}

export function parseStudentFolderItemRef(itemRef: string): string | null {
  if (!itemRef.startsWith(FOLDER_ITEM_PREFIX)) {
    return null;
  }
  const folderId = itemRef.slice(FOLDER_ITEM_PREFIX.length).trim();
  return folderId.length > 0 ? folderId : null;
}

export function parseStudentQuestionnaireItemRef(itemRef: string): string | null {
  if (!itemRef.startsWith(QUESTIONNAIRE_ITEM_PREFIX)) {
    return null;
  }
  const questionnaireId = itemRef.slice(QUESTIONNAIRE_ITEM_PREFIX.length).trim();
  return questionnaireId.length > 0 ? questionnaireId : null;
}

function cloneState(state: StudentQuestionnaireFoldersState): StudentQuestionnaireFoldersState {
  return {
    version: 1,
    folders: state.folders.map((folder) => ({
      ...folder,
      kind: folder.kind || 'user',
    })),
    itemOrderByParent: Object.fromEntries(
      Object.entries(state.itemOrderByParent).map(([parent, items]) => [parent, [...items]])
    ),
    updatedAt: state.updatedAt,
  };
}

function getFolderMap(
  folders: readonly StudentQuestionnaireFolder[]
): Map<string, StudentQuestionnaireFolder> {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

function deriveSystemFolders(
  questionnaireDescriptors: readonly StudentQuestionnaireDescriptor[]
): {
  folders: StudentQuestionnaireFolder[];
  defaultParentByQuestionnaireId: Record<string, string | null>;
} {
  const folderByPath = new Map<string, StudentQuestionnaireFolder>();
  const defaultParentByQuestionnaireId: Record<string, string | null> = {};

  for (const descriptor of questionnaireDescriptors) {
    let assignedParentId: string | null = null;
    for (const rawPath of descriptor.systemFolders || []) {
      const segments = parseSystemFolderPath(rawPath);
      if (segments.length === 0) {
        continue;
      }

      let parentId: string | null = null;
      let pathKey = '';
      for (const segment of segments) {
        const normalizedSegment = segment.toLowerCase();
        pathKey = pathKey ? `${pathKey}/${normalizedSegment}` : normalizedSegment;

        let folder = folderByPath.get(pathKey);
        if (!folder) {
          folder = {
            id: toSystemFolderId(pathKey),
            name: segment,
            parentId,
            kind: 'system',
          };
          folderByPath.set(pathKey, folder);
        }

        parentId = folder.id;
      }

      if (parentId) {
        assignedParentId = parentId;
        break;
      }
    }

    defaultParentByQuestionnaireId[descriptor.id] = assignedParentId;
  }

  return {
    folders: Array.from(folderByPath.values()),
    defaultParentByQuestionnaireId,
  };
}

function normalizeRawUserFolders(
  rawFolders: unknown,
  systemFolders: readonly StudentQuestionnaireFolder[]
): StudentQuestionnaireFolder[] {
  if (!Array.isArray(rawFolders)) {
    return [];
  }

  const systemFolderIds = new Set(systemFolders.map((folder) => folder.id));
  const draft: StudentQuestionnaireFolder[] = [];
  const seenIds = new Set<string>();

  for (const rawFolder of rawFolders) {
    if (!isRecord(rawFolder)) {
      continue;
    }

    const id = trimToNonEmpty(rawFolder.id);
    if (!id || seenIds.has(id)) {
      continue;
    }
    if (systemFolderIds.has(id) || id.startsWith(SYSTEM_FOLDER_ID_PREFIX)) {
      continue;
    }

    const kind = rawFolder.kind === 'system' ? 'system' : 'user';
    if (kind === 'system') {
      continue;
    }

    seenIds.add(id);

    const rawParentId = trimToNonEmpty(rawFolder.parentId);
    draft.push({
      id,
      name: sanitizeFolderName(String(rawFolder.name || ''), draft.length + 1),
      parentId: rawParentId,
      kind: 'user',
    });
  }

  const combinedMap = getFolderMap([...systemFolders, ...draft]);

  return draft.map((folder) => {
    const parentId = folder.parentId;
    if (!parentId || parentId === folder.id || !combinedMap.has(parentId)) {
      return {
        ...folder,
        parentId: null,
      };
    }

    const visited = new Set<string>([folder.id]);
    let cursor: string | null = parentId;

    while (cursor) {
      if (visited.has(cursor)) {
        cursor = null;
        break;
      }
      visited.add(cursor);

      const nextParent = combinedMap.get(cursor)?.parentId || null;
      if (!nextParent || !combinedMap.has(nextParent)) {
        break;
      }
      cursor = nextParent;
    }

    return {
      ...folder,
      parentId: cursor === null ? null : parentId,
    };
  });
}

function normalizeParentKey(
  rawParentKey: string,
  folderMap: ReadonlyMap<string, StudentQuestionnaireFolder>
): string | null {
  if (rawParentKey === STUDENT_FOLDER_ROOT_KEY) {
    return STUDENT_FOLDER_ROOT_KEY;
  }

  const parentId = rawParentKey.trim();
  if (!parentId) {
    return null;
  }

  return folderMap.has(parentId) ? parentId : null;
}

function normalizeRawOrderByParent(
  rawOrderByParent: unknown,
  folders: readonly StudentQuestionnaireFolder[],
  questionnaireDescriptors: readonly StudentQuestionnaireDescriptor[],
  defaultParentByQuestionnaireId: Readonly<Record<string, string | null>>
): Record<string, string[]> {
  const folderMap = getFolderMap(folders);
  const questionnaireIds = questionnaireDescriptors.map((descriptor) => descriptor.id);
  const questionnaireSet = new Set(questionnaireIds);
  const nextOrder: Record<string, string[]> = {
    [STUDENT_FOLDER_ROOT_KEY]: [],
  };

  for (const folder of folders) {
    nextOrder[folder.id] = [];
  }

  const seenRefs = new Set<string>();
  const addRefIfValid = (parentKey: string, ref: string) => {
    if (seenRefs.has(ref)) {
      return;
    }

    const folderId = parseStudentFolderItemRef(ref);
    if (folderId) {
      const folder = folderMap.get(folderId);
      if (!folder) {
        return;
      }
      if (toParentKey(folder.parentId) !== parentKey) {
        return;
      }
      nextOrder[parentKey].push(ref);
      seenRefs.add(ref);
      return;
    }

    const questionnaireId = parseStudentQuestionnaireItemRef(ref);
    if (!questionnaireId || !questionnaireSet.has(questionnaireId)) {
      return;
    }

    nextOrder[parentKey].push(ref);
    seenRefs.add(ref);
  };

  if (isRecord(rawOrderByParent)) {
    for (const [rawParentKey, rawItems] of Object.entries(rawOrderByParent)) {
      const parentKey = normalizeParentKey(rawParentKey, folderMap);
      if (!parentKey || !Array.isArray(rawItems)) {
        continue;
      }

      for (const rawRef of rawItems) {
        if (typeof rawRef !== 'string') {
          continue;
        }

        const ref = rawRef.trim();
        if (!ref) {
          continue;
        }

        addRefIfValid(parentKey, ref);
      }
    }
  }

  for (const folder of folders) {
    const ref = createStudentFolderItemRef(folder.id);
    if (seenRefs.has(ref)) {
      continue;
    }
    nextOrder[toParentKey(folder.parentId)].push(ref);
    seenRefs.add(ref);
  }

  for (const questionnaireId of questionnaireIds) {
    const ref = createStudentQuestionnaireItemRef(questionnaireId);
    if (seenRefs.has(ref)) {
      continue;
    }

    const preferredParentId = defaultParentByQuestionnaireId[questionnaireId] || null;
    const parentKey = toParentKey(
      preferredParentId && folderMap.has(preferredParentId) ? preferredParentId : null
    );

    nextOrder[parentKey].push(ref);
    seenRefs.add(ref);
  }

  return nextOrder;
}

export function createDefaultStudentQuestionnaireFoldersState(): StudentQuestionnaireFoldersState {
  return {
    version: 1,
    folders: [],
    itemOrderByParent: {
      [STUDENT_FOLDER_ROOT_KEY]: [],
    },
    updatedAt: Date.now(),
  };
}

export function normalizeStudentQuestionnaireFoldersState(
  rawState: unknown,
  questionnaires: readonly string[] | readonly StudentQuestionnaireDescriptor[]
): StudentQuestionnaireFoldersState {
  const descriptors = normalizeQuestionnaireDescriptors(questionnaires);
  const state = isRecord(rawState) ? rawState : null;

  const {
    folders: systemFolders,
    defaultParentByQuestionnaireId,
  } = deriveSystemFolders(descriptors);

  const userFolders = normalizeRawUserFolders(state?.folders, systemFolders);
  const folders = [...systemFolders, ...userFolders];

  const itemOrderByParent = normalizeRawOrderByParent(
    state?.itemOrderByParent,
    folders,
    descriptors,
    defaultParentByQuestionnaireId
  );

  const updatedAt =
    typeof state?.updatedAt === 'number' && Number.isFinite(state.updatedAt)
      ? state.updatedAt
      : Date.now();

  return {
    version: 1,
    folders,
    itemOrderByParent,
    updatedAt,
  };
}

export function findStudentItemParentKey(
  state: StudentQuestionnaireFoldersState,
  itemRef: string
): string | null {
  for (const [parentKey, items] of Object.entries(state.itemOrderByParent)) {
    if (items.includes(itemRef)) {
      return parentKey;
    }
  }
  return null;
}

function withUpdatedAt(state: StudentQuestionnaireFoldersState): StudentQuestionnaireFoldersState {
  return {
    ...state,
    updatedAt: Date.now(),
  };
}

function createStudentFolderId(): string {
  return `student-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudentQuestionnaireFolder(
  state: StudentQuestionnaireFoldersState,
  name: string,
  parentId: string | null
): StudentQuestionnaireFoldersState {
  const folderMap = getFolderMap(state.folders);
  const safeParentId = parentId && folderMap.has(parentId) ? parentId : null;
  const next = cloneState(state);
  const folderId = createStudentFolderId();

  next.folders.push({
    id: folderId,
    name: sanitizeFolderName(name, next.folders.length + 1),
    parentId: safeParentId,
    kind: 'user',
  });
  next.itemOrderByParent[folderId] = [];

  const parentKey = toParentKey(safeParentId);
  const parentItems = next.itemOrderByParent[parentKey] || [];
  next.itemOrderByParent[parentKey] = [...parentItems, createStudentFolderItemRef(folderId)];

  return withUpdatedAt(next);
}

export function createStudentQuestionnaireFolderWithItems(
  state: StudentQuestionnaireFoldersState,
  options: {
    name: string;
    parentId: string | null;
    itemRefs?: readonly string[];
  }
): StudentQuestionnaireFoldersState {
  const previousFolderIds = new Set(state.folders.map((folder) => folder.id));
  let next = createStudentQuestionnaireFolder(state, options.name, options.parentId);
  const createdFolder = next.folders.find((folder) => !previousFolderIds.has(folder.id));

  if (!createdFolder || !Array.isArray(options.itemRefs) || options.itemRefs.length === 0) {
    return next;
  }

  const uniqueItemRefs = Array.from(
    new Set(
      options.itemRefs
        .map((itemRef) => itemRef.trim())
        .filter((itemRef) => itemRef && itemRef !== createStudentFolderItemRef(createdFolder.id))
    )
  );

  for (const itemRef of uniqueItemRefs) {
    next = moveStudentItemToParent(next, itemRef, createdFolder.id);
  }

  return next;
}

export function renameStudentQuestionnaireFolder(
  state: StudentQuestionnaireFoldersState,
  folderId: string,
  name: string
): StudentQuestionnaireFoldersState {
  const folderMap = getFolderMap(state.folders);
  const folder = folderMap.get(folderId);
  if (!folder || folder.kind === 'system') {
    return state;
  }

  const nextName = sanitizeFolderName(name, 1);
  if (folder.name === nextName) {
    return state;
  }

  return withUpdatedAt({
    ...state,
    folders: state.folders.map((item) =>
      item.id === folderId
        ? {
            ...item,
            name: nextName,
          }
        : item
    ),
  });
}

export function moveStudentItemByOffset(
  state: StudentQuestionnaireFoldersState,
  itemRef: string,
  direction: 'up' | 'down'
): StudentQuestionnaireFoldersState {
  const movingFolderId = parseStudentFolderItemRef(itemRef);
  if (movingFolderId) {
    const folder = getFolderMap(state.folders).get(movingFolderId);
    if (folder?.kind === 'system') {
      return state;
    }
  }

  const parentKey = findStudentItemParentKey(state, itemRef);
  if (!parentKey) {
    return state;
  }

  const items = state.itemOrderByParent[parentKey] || [];
  const index = items.indexOf(itemRef);
  if (index < 0) {
    return state;
  }

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return state;
  }

  const next = cloneState(state);
  const nextItems = [...items];
  [nextItems[index], nextItems[targetIndex]] = [nextItems[targetIndex], nextItems[index]];
  next.itemOrderByParent[parentKey] = nextItems;
  return withUpdatedAt(next);
}

export function isStudentFolderDescendant(
  state: StudentQuestionnaireFoldersState,
  possibleDescendantId: string | null,
  ancestorFolderId: string
): boolean {
  if (!possibleDescendantId) {
    return false;
  }

  const folderMap = getFolderMap(state.folders);
  let cursor: string | null = possibleDescendantId;
  const visited = new Set<string>();

  while (cursor) {
    if (cursor === ancestorFolderId) {
      return true;
    }
    if (visited.has(cursor)) {
      return false;
    }
    visited.add(cursor);
    cursor = folderMap.get(cursor)?.parentId || null;
  }

  return false;
}

export function moveStudentItemToParent(
  state: StudentQuestionnaireFoldersState,
  itemRef: string,
  targetParentId: string | null
): StudentQuestionnaireFoldersState {
  const currentParentKey = findStudentItemParentKey(state, itemRef);
  if (!currentParentKey) {
    return state;
  }

  const folderMap = getFolderMap(state.folders);
  const safeTargetParentId = targetParentId && folderMap.has(targetParentId) ? targetParentId : null;
  const targetParentKey = toParentKey(safeTargetParentId);

  const movingFolderId = parseStudentFolderItemRef(itemRef);
  if (movingFolderId) {
    const movingFolder = folderMap.get(movingFolderId);
    if (!movingFolder || movingFolder.kind === 'system') {
      return state;
    }

    if (movingFolderId === safeTargetParentId) {
      return state;
    }
    if (isStudentFolderDescendant(state, safeTargetParentId, movingFolderId)) {
      return state;
    }
  }

  if (currentParentKey === targetParentKey) {
    return state;
  }

  const next = cloneState(state);
  next.itemOrderByParent[currentParentKey] = (next.itemOrderByParent[currentParentKey] || []).filter(
    (ref) => ref !== itemRef
  );
  const targetItems = next.itemOrderByParent[targetParentKey] || [];
  next.itemOrderByParent[targetParentKey] = [...targetItems, itemRef];

  if (movingFolderId) {
    next.folders = next.folders.map((folder) =>
      folder.id === movingFolderId
        ? {
            ...folder,
            parentId: safeTargetParentId,
          }
        : folder
    );
  }

  return withUpdatedAt(next);
}

export function isStudentQuestionnaireFolderEmpty(
  state: StudentQuestionnaireFoldersState,
  folderId: string
): boolean {
  return (state.itemOrderByParent[folderId] || []).length === 0;
}

export function deleteStudentQuestionnaireFolder(
  state: StudentQuestionnaireFoldersState,
  folderId: string
): {
  state: StudentQuestionnaireFoldersState;
  error?: 'not-found' | 'not-empty' | 'forbidden';
} {
  const folder = state.folders.find((item) => item.id === folderId);
  if (!folder) {
    return { state, error: 'not-found' };
  }

  if (folder.kind === 'system') {
    return { state, error: 'forbidden' };
  }

  if (!isStudentQuestionnaireFolderEmpty(state, folderId)) {
    return { state, error: 'not-empty' };
  }

  const folderRef = createStudentFolderItemRef(folderId);
  const next = cloneState(state);
  next.folders = next.folders.filter((item) => item.id !== folderId);
  delete next.itemOrderByParent[folderId];

  for (const parentKey of Object.keys(next.itemOrderByParent)) {
    next.itemOrderByParent[parentKey] = (next.itemOrderByParent[parentKey] || []).filter(
      (item) => item !== folderRef
    );
  }

  return {
    state: withUpdatedAt(next),
  };
}

export interface StudentFolderParentOption {
  id: string | null;
  label: string;
  depth: number;
}

export function listStudentFolderParentOptions(
  state: StudentQuestionnaireFoldersState,
  rootLabel: string,
  excludeFolderId?: string
): StudentFolderParentOption[] {
  const folderMap = getFolderMap(state.folders);
  const options: StudentFolderParentOption[] = [
    {
      id: null,
      label: rootLabel,
      depth: 0,
    },
  ];

  const walk = (parentId: string | null, depth: number) => {
    const parentKey = toParentKey(parentId);
    const items = state.itemOrderByParent[parentKey] || [];

    for (const itemRef of items) {
      const folderId = parseStudentFolderItemRef(itemRef);
      if (!folderId) {
        continue;
      }

      if (excludeFolderId) {
        if (folderId === excludeFolderId) {
          continue;
        }
        if (isStudentFolderDescendant(state, folderId, excludeFolderId)) {
          continue;
        }
      }

      const folder = folderMap.get(folderId);
      if (!folder) {
        continue;
      }

      options.push({
        id: folder.id,
        label: folder.name,
        depth,
      });
      walk(folder.id, depth + 1);
    }
  };

  walk(null, 1);
  return options;
}
