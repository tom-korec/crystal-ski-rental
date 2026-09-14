import { isStaff } from '~/lib/roles';

export const LANDING = '/';
export const APP_HOME = '/app';
export const STAFF_HOME = '/staff';

/** Where a signed-in account belongs (FR-3): customers search skis, staff start at the front desk. */
export function homeForRole(role?: string | null): string {
  return isStaff(role) ? STAFF_HOME : APP_HOME;
}
