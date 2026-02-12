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
  RoleSegmentedControl,
} from './ui/ProfileSelectors';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user, switchRole } = useUser();
  const [language, setLangState] = useState<LanguageCode>('ru');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
      const target = event.target;
      if (target instanceof Element && target.closest('[data-profile-menu-root="true"]')) return;
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

  const renderProfileMenu = (
    variant: 'compact' | 'full',
    visibilityClassName: string
  ) => {
    if (!user) return null;

    return (
      <div
        className={`relative shrink-0 ${visibilityClassName}`}
        data-profile-menu-root="true"
      >
        <button
          type="button"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${
            variant === 'compact' ? 'max-w-[8.5rem]' : 'max-w-[10.5rem]'
          }`}
          aria-label={t('nav.profile')}
          aria-haspopup="menu"
          aria-expanded={profileMenuOpen}
        >
          <span className="truncate">
            {variant === 'compact'
              ? user.name
              : `${user.name} • ${t(`header.role.${user.role}`)}`}
          </span>
          <svg
            className={`h-3 w-3 shrink-0 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`}
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
            className="absolute right-0 z-[70] mt-2 min-w-[12rem] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <Link
              to="/dashboard"
              onClick={() => setProfileMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {isAdmin ? t('nav.admin') : t('nav.dashboard')}
            </Link>
            <Link
              to="/profile"
              onClick={() => setProfileMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t('nav.profile')}
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="relative z-40 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-2 md:py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-2">
              <Link
                to="/"
                aria-label={t('nav.home')}
                className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400 sm:max-w-none sm:text-lg md:text-xl"
              >
                <span className="max-[480px]:hidden">Spiritual Self-Assessment</span>
                <span
                  className="hidden h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-white max-[480px]:inline-flex"
                  aria-hidden="true"
                  title="Spiritual Self-Assessment"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 15.5C8 15.5 10 13.5 10 10.5V6.5H14V10.5C14 13.5 16 15.5 19 15.5V17.5C15.7 17.5 13.2 16.1 12 13.9C10.8 16.1 8.3 17.5 5 17.5V15.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
              </Link>
              {renderProfileMenu('compact', 'hidden max-[640px]:block')}
            </div>

            <div className="flex max-w-full items-center gap-2 md:justify-end">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 md:overflow-visible md:pb-0">
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
                  className="shrink-0 rounded-lg bg-gray-100 p-2 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
              </div>
              {renderProfileMenu('full', 'max-[640px]:hidden')}
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
