import { useState, useEffect, useCallback } from 'react';
import type { ArchivedUserRecord, UserData, UserRole } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import {
  createUserBackupPayload,
  downloadUserBackupFile,
  parseUserBackupPayload,
} from '../utils/userBackup';
import { normalizeRoleForProfile } from '../config/appProfile';
import { STORAGE_KEYS } from '../utils/constants';
import { createDefaultStudentQuestionnaireFoldersState } from '../utils/studentQuestionnaireFolders';
import { createDefaultCuratorResultFoldersState } from '../utils/curatorResultFolders';

const USER_UPDATED_EVENT = 'spiritual-user-updated';

function buildArchiveRecordId(user: UserData): string {
  const safeName = user.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');

  return `archive_${safeName || 'user'}_${user.createdAt}`;
}

interface RestoredWorkspaceSnapshot {
  user: UserData;
  session: ReturnType<typeof createUserBackupPayload>['session'];
  pausedSessions: ReturnType<typeof createUserBackupPayload>['pausedSessions'];
  studentResults: ReturnType<typeof createUserBackupPayload>['results'];
  curatorResults: ReturnType<typeof createUserBackupPayload>['curatorResults'];
  customQuestionnaires: ReturnType<typeof createUserBackupPayload>['customQuestionnaires'];
  studentQuestionnaireFolders: ReturnType<
    typeof createUserBackupPayload
  >['studentQuestionnaireFolders'];
  curatorResultFolders: ReturnType<typeof createUserBackupPayload>['curatorResultFolders'];
  appLanguage: string;
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeUserForProfile = useCallback((value: UserData): UserData => {
    const normalizedRole = normalizeRoleForProfile(value.role);
    if (normalizedRole === value.role) {
      return value;
    }
    return {
      ...value,
      role: normalizedRole,
    };
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const [userData, archive] = await Promise.all([
        dataAdapter.getUser(),
        dataAdapter.getArchivedUsers(),
      ]);
      setArchivedUsers(archive);

      if (!userData) {
        setUser(null);
        return;
      }

      const normalizedUser = normalizeUserForProfile(userData);
      if (normalizedUser.role !== userData.role) {
        await dataAdapter.saveUser(normalizedUser);
      }
      setUser(normalizedUser);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [normalizeUserForProfile]);

  const notifyUserUpdated = useCallback(() => {
    window.dispatchEvent(new Event(USER_UPDATED_EVENT));
  }, []);

  const restoreWorkspace = useCallback(
    async (snapshot: RestoredWorkspaceSnapshot): Promise<UserData> => {
      const normalizedUser = normalizeUserForProfile(snapshot.user);

      const existingCustom = await dataAdapter.getCustomQuestionnaires();
      await Promise.all(
        existingCustom.map((questionnaire) =>
          dataAdapter.deleteCustomQuestionnaire(questionnaire.metadata.quality)
        )
      );

      await Promise.all([
        dataAdapter.saveUser(normalizedUser),
        snapshot.session ? dataAdapter.saveSession(snapshot.session) : dataAdapter.clearSession(),
        dataAdapter.savePausedSessions(snapshot.pausedSessions || []),
        dataAdapter.saveResults(snapshot.studentResults || [], 'student'),
        dataAdapter.saveResults(snapshot.curatorResults || [], 'curator'),
        dataAdapter.saveStudentQuestionnaireFolders(
          snapshot.studentQuestionnaireFolders ||
            createDefaultStudentQuestionnaireFoldersState()
        ),
        dataAdapter.saveCuratorResultFolders(
          snapshot.curatorResultFolders || createDefaultCuratorResultFoldersState()
        ),
      ]);

      for (const questionnaire of snapshot.customQuestionnaires || []) {
        await dataAdapter.saveCustomQuestionnaire(questionnaire);
      }

      localStorage.setItem('app-language', snapshot.appLanguage || normalizedUser.language || 'ru');

      setUser(normalizedUser);
      notifyUserUpdated();
      return normalizedUser;
    },
    [normalizeUserForProfile, notifyUserUpdated]
  );

  useEffect(() => {
    loadUser();

    const onUserUpdated = () => {
      loadUser().catch(console.error);
    };

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === STORAGE_KEYS.USER ||
        event.key === STORAGE_KEYS.USER_ARCHIVE
      ) {
        loadUser().catch(console.error);
      }
    };

    window.addEventListener(USER_UPDATED_EVENT, onUserUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, onUserUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadUser]);

  const saveUser = useCallback(async (name: string, role: UserRole) => {
    const existingUser = await dataAdapter.getUser();
    const normalizedRole = normalizeRoleForProfile(role);
    const userData: UserData = {
      name,
      role: normalizedRole,
      createdAt: existingUser?.createdAt ?? Date.now(),
      theme: existingUser?.theme ?? 'light',
      language: localStorage.getItem('app-language') || existingUser?.language || 'ru',
    };
    await dataAdapter.saveUser(userData);
    setUser(userData);
    notifyUserUpdated();
    return userData;
  }, [notifyUserUpdated]);

  const updateUser = useCallback(async (updates: Partial<UserData>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await dataAdapter.saveUser(updated);
    setUser(updated);
    notifyUserUpdated();
  }, [notifyUserUpdated, user]);

  const switchRole = useCallback(async (role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role: normalizeRoleForProfile(role) };
    await dataAdapter.saveUser(updated);
    setUser(updated);
    notifyUserUpdated();
  }, [notifyUserUpdated, user]);

  const exportAndLogout = useCallback(async () => {
    const currentUser = user || (await dataAdapter.getUser());
    if (!currentUser) return;

    const [
      session,
      pausedSessions,
      studentResults,
      curatorResults,
      customQuestionnaires,
      studentQuestionnaireFolders,
      curatorResultFolders,
    ] = await Promise.all([
      dataAdapter.getCurrentSession(),
      dataAdapter.getPausedSessions(),
      dataAdapter.getResults('student'),
      dataAdapter.getResults('curator'),
      dataAdapter.getCustomQuestionnaires(),
      dataAdapter.getStudentQuestionnaireFolders(),
      dataAdapter.getCuratorResultFolders(),
    ]);

    const payload = createUserBackupPayload({
      user: currentUser,
      session,
      pausedSessions,
      studentResults,
      curatorResults,
      customQuestionnaires,
      studentQuestionnaireFolders:
        studentQuestionnaireFolders || createDefaultStudentQuestionnaireFoldersState(),
      curatorResultFolders: curatorResultFolders || createDefaultCuratorResultFoldersState(),
      appLanguage: localStorage.getItem('app-language') || currentUser.language || 'ru',
    });

    const archiveRecord: ArchivedUserRecord = {
      id: buildArchiveRecordId(currentUser),
      savedAt: Date.now(),
      user: currentUser,
      appLanguage: payload.appLanguage,
      session,
      pausedSessions,
      studentResults,
      curatorResults,
      customQuestionnaires,
      studentQuestionnaireFolders:
        studentQuestionnaireFolders || createDefaultStudentQuestionnaireFoldersState(),
      curatorResultFolders: curatorResultFolders || createDefaultCuratorResultFoldersState(),
    };
    await dataAdapter.saveArchivedUser(archiveRecord);

    downloadUserBackupFile(payload);

    await Promise.all([
      dataAdapter.clearSession(),
      dataAdapter.clearPausedSessions(),
      dataAdapter.clearResults('student'),
      dataAdapter.clearResults('curator'),
      dataAdapter.clearUser(),
    ]);

    setUser(null);
    notifyUserUpdated();
  }, [notifyUserUpdated, user]);

  const restoreFromBackup = useCallback(
    async (file: File): Promise<UserData> => {
      const content = await file.text();
      const payload = parseUserBackupPayload(content);
      return restoreWorkspace({
        user: payload.user,
        session: payload.session,
        pausedSessions: payload.pausedSessions,
        studentResults: payload.results,
        curatorResults: payload.curatorResults,
        customQuestionnaires: payload.customQuestionnaires,
        studentQuestionnaireFolders: payload.studentQuestionnaireFolders,
        curatorResultFolders: payload.curatorResultFolders,
        appLanguage: payload.appLanguage,
      });
    },
    [restoreWorkspace]
  );

  const restoreFromArchive = useCallback(
    async (archiveId: string): Promise<UserData> => {
      const record = await dataAdapter.getArchivedUserById(archiveId);
      if (!record) {
        throw new Error('Не удалось найти пользователя в локальном архиве.');
      }

      return restoreWorkspace({
        user: record.user,
        session: record.session,
        pausedSessions: record.pausedSessions,
        studentResults: record.studentResults,
        curatorResults: record.curatorResults,
        customQuestionnaires: record.customQuestionnaires,
        studentQuestionnaireFolders:
          record.studentQuestionnaireFolders || createDefaultStudentQuestionnaireFoldersState(),
        curatorResultFolders:
          record.curatorResultFolders || createDefaultCuratorResultFoldersState(),
        appLanguage: record.appLanguage,
      });
    },
    [restoreWorkspace]
  );

  return {
    user,
    archivedUsers,
    loading,
    saveUser,
    updateUser,
    switchRole,
    exportAndLogout,
    restoreFromBackup,
    restoreFromArchive,
  };
}
