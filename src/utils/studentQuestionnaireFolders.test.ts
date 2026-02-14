import { describe, expect, it } from 'vitest';
import {
  STUDENT_FOLDER_ROOT_KEY,
  createDefaultStudentQuestionnaireFoldersState,
  createStudentFolderItemRef,
  createStudentQuestionnaireFolder,
  createStudentQuestionnaireFolderWithItems,
  createStudentQuestionnaireItemRef,
  deleteStudentQuestionnaireFolder,
  listStudentFolderParentOptions,
  moveStudentItemByOffset,
  moveStudentItemToParent,
  normalizeStudentQuestionnaireFoldersState,
  parseStudentFolderItemRef,
  parseStudentQuestionnaireItemRef,
  renameStudentQuestionnaireFolder,
} from './studentQuestionnaireFolders';

describe('student questionnaire folders', () => {
  it('normalizes empty state and places questionnaires to root', () => {
    const state = normalizeStudentQuestionnaireFoldersState(null, ['q1', 'q2']);
    expect(state.folders).toEqual([]);
    expect(state.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY]).toEqual([
      createStudentQuestionnaireItemRef('q1'),
      createStudentQuestionnaireItemRef('q2'),
    ]);
  });

  it('builds system folders from questionnaire metadata and places quizzes by default', () => {
    const state = normalizeStudentQuestionnaireFoldersState(null, [
      {
        id: 'q1',
        systemFolders: ['System/Primary'],
      },
      {
        id: 'q2',
        systemFolders: ['System/Secondary'],
      },
      {
        id: 'q3',
      },
    ]);

    const topFolder = state.folders.find((folder) => folder.name === 'System');
    expect(topFolder?.kind).toBe('system');

    const primaryFolder = state.folders.find(
      (folder) => folder.name === 'Primary' && folder.parentId === topFolder?.id
    );
    const secondaryFolder = state.folders.find(
      (folder) => folder.name === 'Secondary' && folder.parentId === topFolder?.id
    );

    expect(primaryFolder).toBeTruthy();
    expect(secondaryFolder).toBeTruthy();

    expect(state.itemOrderByParent[primaryFolder?.id || '']).toContain(
      createStudentQuestionnaireItemRef('q1')
    );
    expect(state.itemOrderByParent[secondaryFolder?.id || '']).toContain(
      createStudentQuestionnaireItemRef('q2')
    );
    expect(state.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY]).toContain(
      createStudentQuestionnaireItemRef('q3')
    );
  });

  it('creates user folder and moves questionnaire into it', () => {
    const base = normalizeStudentQuestionnaireFoldersState(null, ['q1', 'q2']);
    const withFolder = createStudentQuestionnaireFolder(base, 'Важное', null);
    const folderRef = withFolder.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY].find((item) =>
      item.startsWith('folder:')
    );
    expect(folderRef).toBeTruthy();

    const folderId = parseStudentFolderItemRef(String(folderRef));
    expect(folderId).toBeTruthy();

    const moved = moveStudentItemToParent(
      withFolder,
      createStudentQuestionnaireItemRef('q2'),
      folderId
    );
    expect(moved.itemOrderByParent[folderId || '']).toContain(
      createStudentQuestionnaireItemRef('q2')
    );
    expect(moved.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY]).not.toContain(
      createStudentQuestionnaireItemRef('q2')
    );
  });

  it('creates folder with selected item refs', () => {
    const base = normalizeStudentQuestionnaireFoldersState(null, ['q1', 'q2']);
    const next = createStudentQuestionnaireFolderWithItems(base, {
      name: 'Important',
      parentId: null,
      itemRefs: [createStudentQuestionnaireItemRef('q2')],
    });

    const createdFolder = next.folders.find((folder) => folder.name === 'Important');
    expect(createdFolder).toBeTruthy();
    expect(next.itemOrderByParent[createdFolder?.id || '']).toContain(
      createStudentQuestionnaireItemRef('q2')
    );
  });

  it('reorders items inside parent', () => {
    const state = normalizeStudentQuestionnaireFoldersState(null, ['q1', 'q2', 'q3']);
    const reordered = moveStudentItemByOffset(state, createStudentQuestionnaireItemRef('q3'), 'up');
    expect(reordered.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY]).toEqual([
      createStudentQuestionnaireItemRef('q1'),
      createStudentQuestionnaireItemRef('q3'),
      createStudentQuestionnaireItemRef('q2'),
    ]);
  });

  it('prevents moving folder into its descendant', () => {
    const base = normalizeStudentQuestionnaireFoldersState(null, ['q1']);
    const rootFolderState = createStudentQuestionnaireFolder(base, 'A', null);
    const rootFolderId = parseStudentFolderItemRef(
      rootFolderState.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY].find((item) =>
        item.startsWith('folder:')
      ) || ''
    );
    expect(rootFolderId).toBeTruthy();

    const nestedState = createStudentQuestionnaireFolder(rootFolderState, 'B', rootFolderId);
    const nestedFolderId = nestedState.folders.find((folder) => folder.parentId === rootFolderId)?.id;
    expect(nestedFolderId).toBeTruthy();

    const rootFolderRef = nestedState.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY].find(
      (item) => parseStudentFolderItemRef(item) === rootFolderId
    );
    expect(rootFolderRef).toBeTruthy();

    const moved = moveStudentItemToParent(nestedState, String(rootFolderRef), nestedFolderId || null);
    const rootFolder = moved.folders.find((folder) => folder.id === rootFolderId);
    expect(rootFolder?.parentId).toBeNull();
  });

  it('does not allow mutating system folders', () => {
    const state = normalizeStudentQuestionnaireFoldersState(null, [
      {
        id: 'q1',
        systemFolders: ['System/Readonly'],
      },
    ]);

    const systemFolder = state.folders.find((folder) => folder.kind === 'system');
    expect(systemFolder).toBeTruthy();

    const renamed = renameStudentQuestionnaireFolder(state, systemFolder?.id || '', 'New Name');
    expect(renamed).toBe(state);

    const deleted = deleteStudentQuestionnaireFolder(state, systemFolder?.id || '');
    expect(deleted.error).toBe('forbidden');

    const moved = moveStudentItemByOffset(state, createStudentFolderItemRef(systemFolder?.id || ''), 'up');
    expect(moved).toBe(state);
  });

  it('does not delete non-empty folder', () => {
    const base = normalizeStudentQuestionnaireFoldersState(null, ['q1']);
    const withFolder = createStudentQuestionnaireFolder(base, 'Folder', null);
    const folderId = withFolder.folders.find((folder) => folder.kind === 'user')?.id;
    expect(folderId).toBeTruthy();

    const moved = moveStudentItemToParent(withFolder, createStudentQuestionnaireItemRef('q1'), folderId);
    const deleteResult = deleteStudentQuestionnaireFolder(moved, folderId || '');
    expect(deleteResult.error).toBe('not-empty');
  });

  it('builds parent options with nested indentation', () => {
    const base = normalizeStudentQuestionnaireFoldersState(null, ['q1']);
    const withFolder = createStudentQuestionnaireFolder(base, 'Top', null);
    const topId = withFolder.folders.find((folder) => folder.kind === 'user')?.id || '';
    const withNested = createStudentQuestionnaireFolder(withFolder, 'Inner', topId);
    const options = listStudentFolderParentOptions(withNested, 'Root');

    expect(options[0]).toEqual({ id: null, label: 'Root', depth: 0 });
    expect(options.some((option) => option.id === topId)).toBe(true);
    expect(options.some((option) => option.depth > 1)).toBe(true);
    expect(
      options.some(
        (option) => option.id !== null && parseStudentQuestionnaireItemRef(option.label) === null
      )
    ).toBe(true);
  });

  it('keeps default shape helper stable', () => {
    const state = createDefaultStudentQuestionnaireFoldersState();
    expect(state.version).toBe(1);
    expect(state.itemOrderByParent[STUDENT_FOLDER_ROOT_KEY]).toEqual([]);
  });
});
