import { useState, useEffect, useCallback } from 'react';
import type { UserData, UserRole } from '../types/questionnaire';
import { dataAdapter } from '../services/localStorageAdapter';
import {
  createUserBackupPayload,
  downloadUserBackupFile,
  parseUserBackupPayload,
} from '../utils/userBackup';
import { normalizeRoleForProfile } from '../config/appProfile';

const USER_UPDATED_EVENT = 'spiritual-user-updated';

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null);
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
      const userData = await dataAdapter.getUser();
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

  useEffect(() => {
    loadUser();

    const onUserUpdated = () => {
      loadUser().catch(console.error);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'spiritual_questionnaire_user') {
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

    const [session, pausedSessions, studentResults, curatorResults, customQuestionnaires] = await Promise.all([
      dataAdapter.getCurrentSession(),
      dataAdapter.getPausedSessions(),
      dataAdapter.getResults('student'),
      dataAdapter.getResults('curator'),
      dataAdapter.getCustomQuestionnaires(),
    ]);

    const payload = createUserBackupPayload({
      user: currentUser,
      session,
      pausedSessions,
      studentResults,
      curatorResults,
      customQuestionnaires,
      appLanguage: localStorage.getItem('app-language') || currentUser.language || 'ru',
    });

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
      const normalizedUser = normalizeUserForProfile(payload.user);

      const existingCustom = await dataAdapter.getCustomQuestionnaires();
      await Promise.all(
        existingCustom.map((questionnaire) =>
          dataAdapter.deleteCustomQuestionnaire(questionnaire.metadata.quality)
        )
      );

      await Promise.all([
        dataAdapter.saveUser(normalizedUser),
        payload.session ? dataAdapter.saveSession(payload.session) : dataAdapter.clearSession(),
        dataAdapter.savePausedSessions(payload.pausedSessions || []),
        dataAdapter.saveResults(payload.results, 'student'),
        dataAdapter.saveResults(payload.curatorResults, 'curator'),
      ]);

      for (const questionnaire of payload.customQuestionnaires) {
        await dataAdapter.saveCustomQuestionnaire(questionnaire);
      }

      localStorage.setItem('app-language', payload.appLanguage || payload.user.language || 'ru');

      setUser(normalizedUser);
      notifyUserUpdated();
      return normalizedUser;
    },
    [normalizeUserForProfile, notifyUserUpdated]
  );

  return {
    user,
    loading,
    saveUser,
    updateUser,
    switchRole,
    exportAndLogout,
    restoreFromBackup,
  };
}
