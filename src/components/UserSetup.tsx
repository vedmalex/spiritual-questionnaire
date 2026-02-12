import { useState, useEffect } from 'react';
import { t, setLanguage, getLanguage, initializeLanguage } from '../utils/i18n';
import type { LanguageCode } from '../types/i18n';
import type { ArchivedUserRecord, UserRole } from '../types/questionnaire';
import { LanguageButtons, RoleCards } from './ui/ProfileSelectors';
import {
  DEFAULT_PROFILE_ROLE,
  ENABLED_ROLES,
  normalizeRoleForProfile,
} from '../config/appProfile';

interface UserSetupProps {
  onSubmit: (name: string, role: UserRole) => void;
  onImportBackup?: (file: File) => Promise<void>;
  archivedUsers?: ArchivedUserRecord[];
  onRestoreArchivedUser?: (archiveId: string) => Promise<void>;
}

export function UserSetup({
  onSubmit,
  onImportBackup,
  archivedUsers = [],
  onRestoreArchivedUser,
}: UserSetupProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(DEFAULT_PROFILE_ROLE);
  const [error, setError] = useState('');
  const [language, setLangState] = useState<LanguageCode>('ru');
  const [importStatus, setImportStatus] = useState('');
  const [importError, setImportError] = useState('');
  const [restoringArchiveId, setRestoringArchiveId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const isRu = language === 'ru';

  useEffect(() => {
    initializeLanguage();
    const initialLanguage = getLanguage();
    setLangState(initialLanguage);
    document.documentElement.lang = initialLanguage;
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setLangState(lang);
    document.documentElement.lang = lang;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('user.error.empty'));
      return;
    }
    
    if (name.trim().length < 2) {
      setError(t('user.error.short'));
      return;
    }
    
    onSubmit(name.trim(), normalizeRoleForProfile(role));
  };

  const handleBackupImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImportBackup) return;
    setImportStatus('');
    setImportError('');

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await onImportBackup(file);
      setImportStatus(t('user.backup.success'));
    } catch (importErr) {
      const message = importErr instanceof Error ? importErr.message : t('user.backup.error');
      setImportError(message);
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRestoreArchivedUser = async (archiveId: string) => {
    if (!onRestoreArchivedUser) return;
    setArchiveError('');
    setRestoringArchiveId(archiveId);
    try {
      await onRestoreArchivedUser(archiveId);
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : t('user.archive.error'));
      setRestoringArchiveId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('user.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('user.subtitle')}
          </p>
        </div>

        <LanguageButtons value={language} onChange={handleLanguageChange} />

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {ENABLED_ROLES.length > 1 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {isRu ? 'Выберите вашу роль:' : 'Select your role:'}
              </p>
              <RoleCards
                value={role}
                onChange={(nextRole) => setRole(normalizeRoleForProfile(nextRole))}
                language={language}
                roles={ENABLED_ROLES}
              />
            </div>
          ) : (
            <RoleCards value={role} onChange={() => {}} language={language} roles={ENABLED_ROLES} />
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                {t('user.placeholder')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder={t('user.placeholder')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              {t('user.continue')}
            </button>
          </div>
        </form>

        {onRestoreArchivedUser && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('user.archive.title')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('user.archive.select')}</p>

            {archivedUsers.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('user.archive.empty')}</p>
            ) : (
              <div className="space-y-2">
                {archivedUsers.map((record) => {
                  const isRestoring = restoringArchiveId === record.id;
                  return (
                    <div
                      key={record.id}
                      className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {record.user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('user.archive.role', {
                          role: t(`header.role.${record.user.role}`),
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {t('user.archive.lastUsed', {
                          date: new Date(record.savedAt).toLocaleString(
                            language === 'ru' ? 'ru-RU' : 'en-US'
                          ),
                        })}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleRestoreArchivedUser(record.id)}
                        disabled={Boolean(restoringArchiveId)}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-xs"
                      >
                        {isRestoring
                          ? t('user.archive.restoring')
                          : t('user.archive.use', { name: record.user.name })}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {archiveError && <p className="text-xs text-red-700 dark:text-red-400">{archiveError}</p>}
          </div>
        )}

        {onImportBackup && (
          <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('user.backup.title')}
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t('user.backup.description')}
            </p>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleBackupImport}
              className="block w-full text-sm text-gray-700 dark:text-gray-200"
            />
            {importStatus && (
              <p className="mt-2 text-xs text-green-700 dark:text-green-400">{importStatus}</p>
            )}
            {importError && (
              <p className="mt-2 text-xs text-red-700 dark:text-red-400">{importError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
