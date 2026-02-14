import type {
  CuratorResultFolder,
  CuratorResultFoldersState,
} from '../types/questionnaire';

export interface CuratorStudentDescriptor {
  key: string;
  name: string;
}

export const CURATOR_FOLDER_ROOT_KEY = '__root__';
const FOLDER_ITEM_PREFIX = 'folder:';
const STUDENT_ITEM_PREFIX = 'student:';
const DEFAULT_FOLDER_NAME = 'Новая папка';

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
  return parentId || CURATOR_FOLDER_ROOT_KEY;
}

export function normalizeCuratorStudentKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeStudentDescriptors(
  students: readonly string[] | readonly CuratorStudentDescriptor[]
): CuratorStudentDescriptor[] {
  const seenKeys = new Set<string>();
  const next: CuratorStudentDescriptor[] = [];

  for (const rawEntry of students) {
    const rawName = typeof rawEntry === 'string' ? rawEntry : rawEntry.name;
    const name = String(rawName || '').trim();
    if (!name) {
      continue;
    }

    const key =
      typeof rawEntry === 'string'
        ? normalizeCuratorStudentKey(name)
        : normalizeCuratorStudentKey(rawEntry.key || name);

    if (!key || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    next.push({
      key,
      name,
    });
  }

  return next;
}

export function createCuratorFolderItemRef(folderId: string): string {
  return `${FOLDER_ITEM_PREFIX}${folderId}`;
}

export function createCuratorStudentItemRef(studentKey: string): string {
  return `${STUDENT_ITEM_PREFIX}${studentKey}`;
}

export function parseCuratorFolderItemRef(itemRef: string): string | null {
  if (!itemRef.startsWith(FOLDER_ITEM_PREFIX)) {
    return null;
  }

  const folderId = itemRef.slice(FOLDER_ITEM_PREFIX.length).trim();
  return folderId.length > 0 ? folderId : null;
}

export function parseCuratorStudentItemRef(itemRef: string): string | null {
  if (!itemRef.startsWith(STUDENT_ITEM_PREFIX)) {
    return null;
  }

  const studentKey = itemRef.slice(STUDENT_ITEM_PREFIX.length).trim();
  return studentKey.length > 0 ? studentKey : null;
}

function cloneState(state: CuratorResultFoldersState): CuratorResultFoldersState {
  return {
    version: 1,
    folders: state.folders.map((folder) => ({ ...folder })),
    itemOrderByParent: Object.fromEntries(
      Object.entries(state.itemOrderByParent).map(([parent, items]) => [parent, [...items]])
    ),
    studentFolderByKey: { ...state.studentFolderByKey },
    updatedAt: state.updatedAt,
  };
}

function getFolderMap(folders: readonly CuratorResultFolder[]): Map<string, CuratorResultFolder> {
  return new Map(folders.map((folder) => [folder.id, folder]));
}

function normalizeRawFolders(rawFolders: unknown): CuratorResultFolder[] {
  if (!Array.isArray(rawFolders)) {
    return [];
  }

  const draft: CuratorResultFolder[] = [];
  const seenIds = new Set<string>();

  for (const rawFolder of rawFolders) {
    if (!isRecord(rawFolder)) {
      continue;
    }

    const id = trimToNonEmpty(rawFolder.id);
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const rawParentId = trimToNonEmpty(rawFolder.parentId);
    draft.push({
      id,
      name: sanitizeFolderName(String(rawFolder.name || ''), draft.length + 1),
      parentId: rawParentId,
    });
  }

  const folderMap = getFolderMap(draft);

  return draft.map((folder) => {
    const parentId = folder.parentId;
    if (!parentId || parentId === folder.id || !folderMap.has(parentId)) {
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

      const nextParent = folderMap.get(cursor)?.parentId || null;
      if (!nextParent || !folderMap.has(nextParent)) {
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
  folderMap: ReadonlyMap<string, CuratorResultFolder>
): string | null {
  if (rawParentKey === CURATOR_FOLDER_ROOT_KEY) {
    return CURATOR_FOLDER_ROOT_KEY;
  }

  const parentId = rawParentKey.trim();
  if (!parentId) {
    return null;
  }

  return folderMap.has(parentId) ? parentId : null;
}

function normalizeStudentFolderMap(
  rawMap: unknown,
  folderMap: ReadonlyMap<string, CuratorResultFolder>
): Record<string, string | null> {
  if (!isRecord(rawMap)) {
    return {};
  }

  const next: Record<string, string | null> = {};

  for (const [rawStudentKey, rawFolderId] of Object.entries(rawMap)) {
    const studentKey = normalizeCuratorStudentKey(String(rawStudentKey || ''));
    if (!studentKey) {
      continue;
    }

    const folderId = trimToNonEmpty(rawFolderId);
    if (!folderId || !folderMap.has(folderId)) {
      next[studentKey] = null;
      continue;
    }

    next[studentKey] = folderId;
  }

  return next;
}

function normalizeRawOrderByParent(
  rawOrderByParent: unknown,
  folders: readonly CuratorResultFolder[],
  students: readonly CuratorStudentDescriptor[],
  studentFolderByKey: Readonly<Record<string, string | null>>
): Record<string, string[]> {
  const folderMap = getFolderMap(folders);
  const studentKeySet = new Set(students.map((student) => student.key));

  const nextOrder: Record<string, string[]> = {
    [CURATOR_FOLDER_ROOT_KEY]: [],
  };

  for (const folder of folders) {
    nextOrder[folder.id] = [];
  }

  const seenRefs = new Set<string>();

  const addRefIfValid = (parentKey: string, ref: string) => {
    if (seenRefs.has(ref)) {
      return;
    }

    const folderId = parseCuratorFolderItemRef(ref);
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

    const studentKey = parseCuratorStudentItemRef(ref);
    if (!studentKey || !studentKeySet.has(studentKey)) {
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
    const ref = createCuratorFolderItemRef(folder.id);
    if (seenRefs.has(ref)) {
      continue;
    }

    nextOrder[toParentKey(folder.parentId)].push(ref);
    seenRefs.add(ref);
  }

  for (const student of students) {
    const ref = createCuratorStudentItemRef(student.key);
    if (seenRefs.has(ref)) {
      continue;
    }

    const preferredFolderId = studentFolderByKey[student.key] || null;
    const parentKey = toParentKey(
      preferredFolderId && folderMap.has(preferredFolderId) ? preferredFolderId : null
    );

    nextOrder[parentKey].push(ref);
    seenRefs.add(ref);
  }

  return nextOrder;
}

export function createDefaultCuratorResultFoldersState(): CuratorResultFoldersState {
  return {
    version: 1,
    folders: [],
    itemOrderByParent: {
      [CURATOR_FOLDER_ROOT_KEY]: [],
    },
    studentFolderByKey: {},
    updatedAt: Date.now(),
  };
}

export function normalizeCuratorResultFoldersState(
  rawState: unknown,
  students: readonly string[] | readonly CuratorStudentDescriptor[]
): CuratorResultFoldersState {
  const normalizedStudents = normalizeStudentDescriptors(students);
  const state = isRecord(rawState) ? rawState : null;
  const folders = normalizeRawFolders(state?.folders);
  const folderMap = getFolderMap(folders);

  const normalizedStudentFolderByKey = normalizeStudentFolderMap(
    state?.studentFolderByKey,
    folderMap
  );

  const itemOrderByParent = normalizeRawOrderByParent(
    state?.itemOrderByParent,
    folders,
    normalizedStudents,
    normalizedStudentFolderByKey
  );

  const studentFolderByKey: Record<string, string | null> = {
    ...normalizedStudentFolderByKey,
  };

  for (const student of normalizedStudents) {
    const studentRef = createCuratorStudentItemRef(student.key);
    const parentKey = findCuratorItemParentKey(
      {
        version: 1,
        folders,
        itemOrderByParent,
        studentFolderByKey,
        updatedAt: Date.now(),
      },
      studentRef
    );

    if (!parentKey || parentKey === CURATOR_FOLDER_ROOT_KEY) {
      studentFolderByKey[student.key] = null;
      continue;
    }

    studentFolderByKey[student.key] = folderMap.has(parentKey) ? parentKey : null;
  }

  const updatedAt =
    typeof state?.updatedAt === 'number' && Number.isFinite(state.updatedAt)
      ? state.updatedAt
      : Date.now();

  return {
    version: 1,
    folders,
    itemOrderByParent,
    studentFolderByKey,
    updatedAt,
  };
}

function withUpdatedAt(state: CuratorResultFoldersState): CuratorResultFoldersState {
  return {
    ...state,
    updatedAt: Date.now(),
  };
}

function createCuratorFolderId(): string {
  return `curator-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCuratorResultFolder(
  state: CuratorResultFoldersState,
  name: string,
  parentId: string | null
): CuratorResultFoldersState {
  const folderMap = getFolderMap(state.folders);
  const safeParentId = parentId && folderMap.has(parentId) ? parentId : null;

  const next = cloneState(state);
  const folderId = createCuratorFolderId();

  next.folders.push({
    id: folderId,
    name: sanitizeFolderName(name, next.folders.length + 1),
    parentId: safeParentId,
  });
  next.itemOrderByParent[folderId] = [];

  const parentKey = toParentKey(safeParentId);
  const parentItems = next.itemOrderByParent[parentKey] || [];
  next.itemOrderByParent[parentKey] = [...parentItems, createCuratorFolderItemRef(folderId)];

  return withUpdatedAt(next);
}

export function createCuratorResultFolderWithId(
  state: CuratorResultFoldersState,
  name: string,
  parentId: string | null
): {
  state: CuratorResultFoldersState;
  folderId: string | null;
} {
  const existingIds = new Set(state.folders.map((folder) => folder.id));
  const next = createCuratorResultFolder(state, name, parentId);
  const created = next.folders.find((folder) => !existingIds.has(folder.id));

  return {
    state: next,
    folderId: created?.id || null,
  };
}

export function renameCuratorResultFolder(
  state: CuratorResultFoldersState,
  folderId: string,
  name: string
): CuratorResultFoldersState {
  const nextName = sanitizeFolderName(name, 1);
  let changed = false;

  const nextFolders = state.folders.map((folder) => {
    if (folder.id !== folderId || folder.name === nextName) {
      return folder;
    }

    changed = true;
    return {
      ...folder,
      name: nextName,
    };
  });

  if (!changed) {
    return state;
  }

  return withUpdatedAt({
    ...state,
    folders: nextFolders,
  });
}

export function findCuratorItemParentKey(
  state: CuratorResultFoldersState,
  itemRef: string
): string | null {
  for (const [parentKey, items] of Object.entries(state.itemOrderByParent)) {
    if (items.includes(itemRef)) {
      return parentKey;
    }
  }

  return null;
}

export function isCuratorFolderDescendant(
  state: CuratorResultFoldersState,
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

export function moveCuratorItemToParent(
  state: CuratorResultFoldersState,
  itemRef: string,
  targetParentId: string | null
): CuratorResultFoldersState {
  const currentParentKey = findCuratorItemParentKey(state, itemRef);
  if (!currentParentKey) {
    return state;
  }

  const folderMap = getFolderMap(state.folders);
  const safeTargetParentId = targetParentId && folderMap.has(targetParentId) ? targetParentId : null;
  const targetParentKey = toParentKey(safeTargetParentId);

  const movingFolderId = parseCuratorFolderItemRef(itemRef);
  if (movingFolderId) {
    if (movingFolderId === safeTargetParentId) {
      return state;
    }

    if (isCuratorFolderDescendant(state, safeTargetParentId, movingFolderId)) {
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

  const studentKey = parseCuratorStudentItemRef(itemRef);
  if (studentKey) {
    next.studentFolderByKey[studentKey] = safeTargetParentId;
  }

  return withUpdatedAt(next);
}

export function moveCuratorItemByOffset(
  state: CuratorResultFoldersState,
  itemRef: string,
  direction: 'up' | 'down'
): CuratorResultFoldersState {
  const parentKey = findCuratorItemParentKey(state, itemRef);
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

export function assignCuratorStudentToFolder(
  state: CuratorResultFoldersState,
  studentKey: string,
  folderId: string | null
): CuratorResultFoldersState {
  const normalizedStudentKey = normalizeCuratorStudentKey(studentKey);
  if (!normalizedStudentKey) {
    return state;
  }

  const folderMap = getFolderMap(state.folders);
  const safeFolderId = folderId && folderMap.has(folderId) ? folderId : null;
  const studentRef = createCuratorStudentItemRef(normalizedStudentKey);
  const currentParentKey = findCuratorItemParentKey(state, studentRef);

  let next = cloneState(state);
  next.studentFolderByKey[normalizedStudentKey] = safeFolderId;

  const targetParentKey = toParentKey(safeFolderId);

  if (currentParentKey) {
    if (currentParentKey === targetParentKey) {
      return withUpdatedAt(next);
    }

    next.itemOrderByParent[currentParentKey] = (next.itemOrderByParent[currentParentKey] || []).filter(
      (item) => item !== studentRef
    );
  }

  for (const parentKey of Object.keys(next.itemOrderByParent)) {
    next.itemOrderByParent[parentKey] = (next.itemOrderByParent[parentKey] || []).filter(
      (item) => item !== studentRef
    );
  }

  next.itemOrderByParent[targetParentKey] = [
    ...(next.itemOrderByParent[targetParentKey] || []),
    studentRef,
  ];

  return withUpdatedAt(next);
}

export function isCuratorResultFolderEmpty(
  state: CuratorResultFoldersState,
  folderId: string
): boolean {
  return (state.itemOrderByParent[folderId] || []).length === 0;
}

export function deleteCuratorResultFolder(
  state: CuratorResultFoldersState,
  folderId: string
): {
  state: CuratorResultFoldersState;
  error?: 'not-found' | 'not-empty';
} {
  const folderExists = state.folders.some((folder) => folder.id === folderId);
  if (!folderExists) {
    return {
      state,
      error: 'not-found',
    };
  }

  if (!isCuratorResultFolderEmpty(state, folderId)) {
    return {
      state,
      error: 'not-empty',
    };
  }

  const folderRef = createCuratorFolderItemRef(folderId);
  const next = cloneState(state);

  next.folders = next.folders.filter((folder) => folder.id !== folderId);
  delete next.itemOrderByParent[folderId];

  for (const parentKey of Object.keys(next.itemOrderByParent)) {
    next.itemOrderByParent[parentKey] = (next.itemOrderByParent[parentKey] || []).filter(
      (item) => item !== folderRef
    );
  }

  for (const [studentKey, assignedFolderId] of Object.entries(next.studentFolderByKey)) {
    if (assignedFolderId === folderId) {
      next.studentFolderByKey[studentKey] = null;
    }
  }

  return {
    state: withUpdatedAt(next),
  };
}

export interface CuratorFolderParentOption {
  id: string | null;
  label: string;
  depth: number;
}

export function listCuratorFolderParentOptions(
  state: CuratorResultFoldersState,
  rootLabel: string,
  excludeFolderId?: string
): CuratorFolderParentOption[] {
  const folderMap = getFolderMap(state.folders);

  const options: CuratorFolderParentOption[] = [
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
      const folderId = parseCuratorFolderItemRef(itemRef);
      if (!folderId) {
        continue;
      }

      if (excludeFolderId) {
        if (folderId === excludeFolderId) {
          continue;
        }

        if (isCuratorFolderDescendant(state, folderId, excludeFolderId)) {
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
