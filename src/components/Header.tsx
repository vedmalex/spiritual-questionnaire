import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useUser } from '../hooks/useUser';
import { t, setLanguage, getLanguage, initializeLanguage } from '../utils/i18n';
import type { LanguageCode } from '../types/i18n';
import type { UserRole } from '../types/questionnaire';
import {
  canSwitchRoles,
  ENABLED_ROLES,
  isAdminFeaturesEnabled,
  isRoleEnabled,
  normalizeRoleForProfile,
} from '../config/appProfile';
import {
  LanguageSegmentedControl,
  LanguageSelect,
  RoleSegmentedControl,
  RoleSelect,
} from './ui/ProfileSelectors';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, switchRole, exportAndLogout } = useUser();
  const [language, setLangState] = useState<LanguageCode>('ru');
  const [logoutLoading, setLogoutLoading] = useState(false);
  const isAdmin = user?.role === 'admin' && isAdminFeaturesEnabled();
  const roleSwitchVisible = Boolean(user) && canSwitchRoles();

  useEffect(() => {
    initializeLanguage();
    const current = getLanguage();
    setLangState(current);
    document.documentElement.lang = current;
  }, []);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setLangState(lang);
    document.documentElement.lang = lang;
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!isRoleEnabled(role)) return;
    await switchRole(normalizeRoleForProfile(role));
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await exportAndLogout();
      window.location.assign('/');
    } catch (error) {
      console.error('Logout export failed:', error);
      alert(t('header.logoutError'));
      setLogoutLoading(false);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Link
              to="/"
              className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[15rem] sm:max-w-none"
            >
              Spiritual Self-Assessment
            </Link>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {roleSwitchVisible && (
                <>
                  <div className="sm:hidden">
                    <RoleSelect
                      value={user?.role ?? ENABLED_ROLES[0] ?? 'student'}
                      roles={ENABLED_ROLES}
                      onChange={(role) => {
                        void handleRoleChange(role);
                      }}
                    />
                  </div>
                  <div className="hidden sm:block">
                    <RoleSegmentedControl
                      value={user?.role ?? ENABLED_ROLES[0] ?? 'student'}
                      roles={ENABLED_ROLES}
                      onChange={(role) => {
                        void handleRoleChange(role);
                      }}
                    />
                  </div>
                </>
              )}

              <div className="sm:hidden">
                <LanguageSelect value={language} onChange={handleLanguageChange} />
              </div>
              <div className="hidden sm:block">
                <LanguageSegmentedControl value={language} onChange={handleLanguageChange} />
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                )}
              </button>

              {user && (
                <>
                  <span className="hidden lg:inline px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300">
                    {user.name} • {t(`header.role.${user.role}`)}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logoutLoading}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm transition-colors"
                  >
                    {logoutLoading ? t('header.loggingOut') : t('header.logout')}
                  </button>
                </>
              )}
            </div>
          </div>

          <nav className="mt-2 pb-1">
            <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap">
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                activeProps={{
                  className:
                    'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                }}
              >
                {t('nav.home')}
              </Link>

              {user && (
                <Link
                  to="/dashboard"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  activeProps={{
                    className:
                      'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                  }}
                >
                  {isAdmin ? t('nav.admin') : t('nav.dashboard')}
                </Link>
              )}

              {user && (
                <Link
                  to="/profile"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  activeProps={{
                    className:
                      'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                  }}
                >
                  {t('nav.profile')}
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/editor"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  activeProps={{
                    className:
                      'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                  }}
                >
                  {t('nav.editor')}
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/translations"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  activeProps={{
                    className:
                      'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20',
                  }}
                >
                  {t('nav.translations')}
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
