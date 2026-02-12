import type { LanguageCode } from '../../types/i18n';
import type { UserRole } from '../../types/questionnaire';
import { t } from '../../utils/i18n';

function joinClasses(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}

type RoleChangeHandler = (role: UserRole) => void;
type LanguageChangeHandler = (language: LanguageCode) => void;
const DEFAULT_ROLE_ORDER: UserRole[] = ['student', 'curator', 'admin'];

const roleCardMeta: Record<
  UserRole,
  {
    icon: string;
    description: { ru: string; en: string };
  }
> = {
  student: {
    icon: '👨‍🎓',
    description: {
      ru: 'Прохожу опросы',
      en: 'Take questionnaires',
    },
  },
  curator: {
    icon: '👨‍🏫',
    description: {
      ru: 'Проверяю ответы',
      en: 'Review submissions',
    },
  },
  admin: {
    icon: '⚙️',
    description: {
      ru: 'Управляю системой',
      en: 'Manage system',
    },
  },
};

interface RoleSelectProps {
  value: UserRole;
  onChange: RoleChangeHandler;
  roles?: UserRole[];
  className?: string;
  ariaLabel?: string;
}

export function RoleSelect({
  value,
  onChange,
  roles = DEFAULT_ROLE_ORDER,
  className,
  ariaLabel = 'Select role',
}: RoleSelectProps) {
  const availableRoles = roles.length > 0 ? roles : DEFAULT_ROLE_ORDER;

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as UserRole)}
      className={joinClasses(
        'px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200',
        className
      )}
      aria-label={ariaLabel}
    >
      {availableRoles.map((role) => (
        <option key={role} value={role}>
          {t(`header.role.${role}`)}
        </option>
      ))}
    </select>
  );
}

interface RoleSegmentedControlProps {
  value: UserRole;
  onChange: RoleChangeHandler;
  roles?: UserRole[];
  className?: string;
}

export function RoleSegmentedControl({
  value,
  onChange,
  roles = DEFAULT_ROLE_ORDER,
  className,
}: RoleSegmentedControlProps) {
  const roleOrder = roles.length > 0 ? roles : DEFAULT_ROLE_ORDER;

  return (
    <div
      className={joinClasses(
        'flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1',
        className
      )}
    >
      {roleOrder.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => onChange(role)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            value === role
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label={`Switch to ${role} role`}
        >
          {t(`header.role.${role}`)}
        </button>
      ))}
    </div>
  );
}

interface RoleCardsProps {
  value: UserRole;
  onChange: RoleChangeHandler;
  language: LanguageCode;
  roles?: UserRole[];
  className?: string;
}

export function RoleCards({
  value,
  onChange,
  language,
  roles = DEFAULT_ROLE_ORDER,
  className,
}: RoleCardsProps) {
  const roleOrder = roles.length > 0 ? roles : DEFAULT_ROLE_ORDER;

  return (
    <div className={joinClasses('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
      {roleOrder.map((role) => {
        const cardMeta = roleCardMeta[role];
        const isActive = value === role;

        return (
          <button
            key={role}
            type="button"
            onClick={() => onChange(role)}
            className={`p-4 rounded-lg border-2 text-center transition-all ${
              isActive
                ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">{cardMeta.icon}</div>
            <div className="font-medium text-gray-900 dark:text-white">{t(`header.role.${role}`)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {cardMeta.description[language]}
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface LanguageSelectProps {
  value: LanguageCode;
  onChange: LanguageChangeHandler;
  className?: string;
  ariaLabel?: string;
}

export function LanguageSelect({
  value,
  onChange,
  className,
  ariaLabel = 'Select language',
}: LanguageSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as LanguageCode)}
      className={joinClasses(
        'px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200',
        className
      )}
      aria-label={ariaLabel}
    >
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  );
}

interface LanguageSegmentedControlProps {
  value: LanguageCode;
  onChange: LanguageChangeHandler;
  className?: string;
}

export function LanguageSegmentedControl({
  value,
  onChange,
  className,
}: LanguageSegmentedControlProps) {
  return (
    <div
      className={joinClasses(
        'flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange('ru')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          value === 'ru'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
          value === 'en'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}

interface LanguageButtonsProps {
  value: LanguageCode;
  onChange: LanguageChangeHandler;
  className?: string;
}

export function LanguageButtons({ value, onChange, className }: LanguageButtonsProps) {
  return (
    <div className={joinClasses('flex justify-center space-x-4', className)}>
      <button
        type="button"
        onClick={() => onChange('ru')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          value === 'ru'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        🇷🇺 Русский
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          value === 'en'
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        🇬🇧 English
      </button>
    </div>
  );
}
