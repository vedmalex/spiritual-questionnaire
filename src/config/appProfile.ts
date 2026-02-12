import type { UserRole } from '../types/questionnaire';

export type AppProfile = 'full' | 'student' | 'curator';

function normalizeProfile(rawValue: string): AppProfile {
  if (rawValue === 'student' || rawValue === 'curator') {
    return rawValue;
  }
  return 'full';
}

export const APP_PROFILE: AppProfile = normalizeProfile(
  String(import.meta.env.VITE_APP_PROFILE || 'full').trim().toLowerCase()
);

const PROFILE_ROLES: Record<AppProfile, UserRole[]> = {
  full: ['student', 'curator', 'admin'],
  student: ['student'],
  curator: ['curator'],
};

export const ENABLED_ROLES: UserRole[] = PROFILE_ROLES[APP_PROFILE];
export const DEFAULT_PROFILE_ROLE: UserRole = ENABLED_ROLES[0] || 'student';

export function isRoleEnabled(role: UserRole): boolean {
  return ENABLED_ROLES.includes(role);
}

export function normalizeRoleForProfile(role: UserRole): UserRole {
  return isRoleEnabled(role) ? role : DEFAULT_PROFILE_ROLE;
}

export function canSwitchRoles(): boolean {
  return ENABLED_ROLES.length > 1;
}

export function isAdminFeaturesEnabled(): boolean {
  return isRoleEnabled('admin');
}

