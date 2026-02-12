import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { QuestionnaireLoader } from './QuestionnaireLoader';
import { useUser } from '../hooks/useUser';
import { useQuestionnaires } from '../hooks/useQuestionnaires';
import { useTheme } from '../hooks/useTheme';
import { t, getLanguage, initializeLanguage, setLanguage, subscribeLanguage } from '../utils/i18n';
import type { LanguageCode } from '../types/i18n';
import type { UserRole } from '../types/questionnaire';
import { ENABLED_ROLES, canSwitchRoles, isRoleEnabled } from '../config/appProfile';
import { LanguageSelect, RoleSelect } from './ui/ProfileSelectors';
import { ConfirmModal } from './ui/ConfirmModal';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading, updateUser, switchRole, exportAndLogout } = useUser();
  const { refresh } = useQuestionnaires();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [language, setLanguageState] = useState<LanguageCode>('ru');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    initializeLanguage();
    setLanguageState(getLanguage());
    return subscribeLanguage((nextLanguage) => {
      setLanguageState(nextLanguage);
    });
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: '/' });
      return;
    }

    if (user) {
      setName(user.name);
    }
  }, [loading, navigate, user]);

  const handleSaveName = async () => {
    const normalized = name.trim();
    if (!normalized) {
      setError(t('profile.error.name.empty'));
      setStatus('');
      return;
    }
    if (normalized.length < 2) {
      setError(t('profile.error.name.short'));
      setStatus('');
      return;
    }

    await updateUser({ name: normalized });
    setStatus(t('profile.status.saved'));
    setError('');
  };

  const handleLanguageChange = (nextLanguage: LanguageCode) => {
    setLanguage(nextLanguage);
    setLanguageState(nextLanguage);
    void updateUser({ language: nextLanguage });
    setStatus(t('profile.status.language'));
    setError('');
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!isRoleEnabled(role)) return;
    await switchRole(role);
    setStatus(t('profile.status.role'));
    setError('');
  };

  const handleThemeChange = (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    void updateUser({ theme: nextTheme });
    setStatus(t('profile.status.theme'));
    setError('');
  };

  const executeLogout = async () => {
    setLogoutError('');
    setLogoutLoading(true);
    try {
      await exportAndLogout();
      window.location.assign('/');
    } catch (logoutErr) {
      console.error('Logout export failed:', logoutErr);
      setLogoutError(t('header.logoutError'));
      setLogoutLoading(false);
      setShowLogoutWarning(false);
      setShowLogoutConfirm(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('profile.title')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.subtitle')}</p>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.name.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="md:col-span-2 flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            {t('profile.name.label')}
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder={t('profile.name.placeholder')}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                void handleSaveName();
              }}
              className="w-full px-3 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
            >
              {t('profile.actions.saveName')}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.settings.title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            {t('profile.settings.language')}
            <LanguageSelect value={language} onChange={handleLanguageChange} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            {t('profile.settings.theme')}
            <select
              value={theme}
              onChange={(event) => handleThemeChange(event.target.value as 'light' | 'dark')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="light">{t('profile.settings.theme.light')}</option>
              <option value="dark">{t('profile.settings.theme.dark')}</option>
            </select>
          </label>

          {canSwitchRoles() && (
            <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
              {t('profile.settings.role')}
              <RoleSelect
                value={user.role}
                onChange={(nextRole) => {
                  void handleRoleChange(nextRole);
                }}
                roles={ENABLED_ROLES}
              />
            </label>
          )}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.transfer.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('profile.transfer.subtitle')}</p>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
          <li>{t('profile.transfer.export')}</li>
          <li>{t('profile.transfer.import')}</li>
        </ul>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.logout.title')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('profile.logout.description')}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('profile.logout.howToReturn')}
        </p>
        <button
          type="button"
          onClick={() => {
            if (logoutLoading) return;
            setLogoutError('');
            setShowLogoutConfirm(true);
          }}
          disabled={logoutLoading}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm"
        >
          {logoutLoading ? t('header.loggingOut') : t('profile.logout.action')}
        </button>
        {logoutError && (
          <p className="text-sm text-red-700 dark:text-red-400">{logoutError}</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('profile.questionnaires.title')}
        </h2>
        <QuestionnaireLoader onLoaded={refresh} />
      </section>

      {status && (
        <section className="p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {status}
        </section>
      )}

      {error && (
        <section className="p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </section>
      )}

      <ConfirmModal
        open={showLogoutConfirm}
        title={t('header.logoutConfirmTitle')}
        description={t('header.logoutConfirm')}
        confirmLabel={t('header.logoutContinue')}
        cancelLabel={t('header.logoutStay')}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          setShowLogoutWarning(true);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmModal
        open={showLogoutWarning}
        title={t('header.logoutBackupTitle')}
        description={t('header.logoutSaveWarning')}
        confirmLabel={logoutLoading ? t('header.loggingOut') : t('header.logoutBackupAction')}
        cancelLabel={t('header.logoutStay')}
        onConfirm={() => {
          void executeLogout();
        }}
        onCancel={() => setShowLogoutWarning(false)}
        confirmVariant="danger"
        loading={logoutLoading}
      />
    </div>
  );
}
