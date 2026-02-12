import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
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
  RoleSegmentedControl,
} from './ui/ProfileSelectors';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, switchRole } = useUser();
  const [language, setLangState] = useState<LanguageCode>('ru');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const isAdmin = user?.role === 'admin' && isAdminFeaturesEnabled();
  const roleSwitchVisible = Boolean(user) && canSwitchRoles();

  useEffect(() => {
    initializeLanguage();
    const current = getLanguage();
    setLangState(current);
    document.documentElement.lang = current;
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (profileMenuRef.current.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [profileMenuOpen]);

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setLangState(lang);
    document.documentElement.lang = lang;
  };

  const handleRoleChange = async (role: UserRole) => {
    if (!isRoleEnabled(role)) return;
    await switchRole(normalizeRoleForProfile(role));
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <Link
              to="/"
              aria-label={t('nav.home')}
              className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[15rem] sm:max-w-none"
            >
              Spiritual Self-Assessment
            </Link>

            <div className="flex items-center gap-2 md:justify-end overflow-x-auto md:overflow-visible pb-1 md:pb-0 max-w-full">
              {roleSwitchVisible && (
                <RoleSegmentedControl
                  value={user?.role ?? ENABLED_ROLES[0] ?? 'student'}
                  roles={ENABLED_ROLES}
                  className="shrink-0"
                  onChange={(role) => {
                    void handleRoleChange(role);
                  }}
                />
              )}

              <LanguageSegmentedControl
                value={language}
                onChange={handleLanguageChange}
                className="shrink-0"
              />

              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
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
                <div className="relative shrink-0" ref={profileMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    aria-label={t('nav.profile')}
                    aria-haspopup="menu"
                    aria-expanded={profileMenuOpen}
                  >
                    <span>
                      {user.name} • {t(`header.role.${user.role}`)}
                    </span>
                    <svg
                      className={`w-3 h-3 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {profileMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-30 mt-2 min-w-[12rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-1"
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {isAdmin ? t('nav.admin') : t('nav.dashboard')}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('nav.profile')}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <nav className="mt-2 pb-1">
              <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible whitespace-nowrap">
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
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
