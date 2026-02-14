import { describe, expect, it } from 'vitest';
import {
  CURATOR_FOLDER_ROOT_KEY,
  assignCuratorStudentToFolder,
  createCuratorResultFolder,
  createCuratorStudentItemRef,
  createDefaultCuratorResultFoldersState,
  deleteCuratorResultFolder,
  listCuratorFolderParentOptions,
  moveCuratorItemByOffset,
  moveCuratorItemToParent,
  normalizeCuratorResultFoldersState,
  normalizeCuratorStudentKey,
  parseCuratorFolderItemRef,
  parseCuratorStudentItemRef,
  renameCuratorResultFolder,
} from './curatorResultFolders';

describe('curator result folders', () => {
  it('normalizes empty state with students in root', () => {
    const state = normalizeCuratorResultFoldersState(null, ['Student A', 'Student B']);
    expect(state.folders).toEqual([]);
    expect(state.itemOrderByParent[CURATOR_FOLDER_ROOT_KEY]).toEqual([
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student A')),
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student B')),
    ]);
  });

  it('creates folder and assigns student into it', () => {
    const base = normalizeCuratorResultFoldersState(null, ['Student A', 'Student B']);
    const withFolder = createCuratorResultFolder(base, 'Group 1', null);
    const folderRef = withFolder.itemOrderByParent[CURATOR_FOLDER_ROOT_KEY].find((item) =>
      item.startsWith('folder:')
    );

    expect(folderRef).toBeTruthy();

    const folderId = parseCuratorFolderItemRef(String(folderRef));
    const next = assignCuratorStudentToFolder(
      withFolder,
      normalizeCuratorStudentKey('Student B'),
      folderId
    );

    expect(next.itemOrderByParent[folderId || '']).toContain(
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student B'))
    );
    expect(next.studentFolderByKey[normalizeCuratorStudentKey('Student B')]).toBe(folderId);
  });

  it('moves folder and blocks moving it into descendant', () => {
    const base = normalizeCuratorResultFoldersState(null, ['Student A']);
    const withTop = createCuratorResultFolder(base, 'Top', null);
    const topFolderId = withTop.folders[0]?.id || '';

    const withNested = createCuratorResultFolder(withTop, 'Nested', topFolderId);
    const nestedFolder = withNested.folders.find((folder) => folder.parentId === topFolderId);
    expect(nestedFolder).toBeTruthy();

    const topFolderRef = withNested.itemOrderByParent[CURATOR_FOLDER_ROOT_KEY].find(
      (item) => parseCuratorFolderItemRef(item) === topFolderId
    );

    const unchanged = moveCuratorItemToParent(
      withNested,
      String(topFolderRef),
      nestedFolder?.id || null
    );

    expect(unchanged.folders.find((folder) => folder.id === topFolderId)?.parentId).toBeNull();
  });

  it('reorders items and persists student mapping when moved by parent selection', () => {
    const base = normalizeCuratorResultFoldersState(null, ['Student A', 'Student B', 'Student C']);
    const reordered = moveCuratorItemByOffset(
      base,
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student C')),
      'up'
    );

    expect(reordered.itemOrderByParent[CURATOR_FOLDER_ROOT_KEY]).toEqual([
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student A')),
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student C')),
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student B')),
    ]);

    const withFolder = createCuratorResultFolder(reordered, 'Assigned', null);
    const folderId = withFolder.folders[0]?.id || null;
    const moved = moveCuratorItemToParent(
      withFolder,
      createCuratorStudentItemRef(normalizeCuratorStudentKey('Student A')),
      folderId
    );

    expect(moved.studentFolderByKey[normalizeCuratorStudentKey('Student A')]).toBe(folderId);
  });

  it('renames folder and forbids deleting non-empty folder', () => {
    const base = normalizeCuratorResultFoldersState(null, ['Student A']);
    const withFolder = createCuratorResultFolder(base, 'Original', null);
    const folderId = withFolder.folders[0]?.id || '';

    const renamed = renameCuratorResultFolder(withFolder, folderId, 'Renamed');
    expect(renamed.folders[0]?.name).toBe('Renamed');

    const assigned = assignCuratorStudentToFolder(
      renamed,
      normalizeCuratorStudentKey('Student A'),
      folderId
    );
    const deleted = deleteCuratorResultFolder(assigned, folderId);

    expect(deleted.error).toBe('not-empty');
  });

  it('builds parent options with nested structure', () => {
    const base = normalizeCuratorResultFoldersState(null, ['Student A']);
    const top = createCuratorResultFolder(base, 'Top', null);
    const topId = top.folders[0]?.id || '';
    const nested = createCuratorResultFolder(top, 'Inner', topId);

    const options = listCuratorFolderParentOptions(nested, 'Root');
    expect(options[0]).toEqual({ id: null, label: 'Root', depth: 0 });
    expect(options.some((option) => option.id === topId)).toBe(true);
    expect(options.some((option) => option.depth > 1)).toBe(true);
    expect(
      options.some(
        (option) => option.id !== null && parseCuratorStudentItemRef(option.label) === null
      )
    ).toBe(true);
  });

  it('keeps default shape stable', () => {
    const state = createDefaultCuratorResultFoldersState();
    expect(state.version).toBe(1);
    expect(state.itemOrderByParent[CURATOR_FOLDER_ROOT_KEY]).toEqual([]);
  });
});
