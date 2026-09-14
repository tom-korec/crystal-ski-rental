import { isStaff } from '~/lib/roles';

export const LANDING = '/';
export const APP_HOME = '/app';
export const APP_RESERVATIONS = '/app/reservations';
export const STAFF_HOME = '/staff';

/** Where a signed-in account belongs (FR-3): customers search skis, staff start at the front desk. */
export function homeForRole(role?: string | null): string {
  return isStaff(role) ? STAFF_HOME : APP_HOME;
}

/** Query parameters the ski search keeps its view state in (FR-35). */
export const SEARCH_PARAMS = {
  from: 'from',
  to: 'to',
  store: 'store',
  brand: 'brand',
  model: 'model',
  type: 'type',
  gender: 'gender',
  level: 'level',
  minLength: 'minLength',
  maxLength: 'maxLength',
  maxPrice: 'maxPrice',
  rating: 'rating',
  sort: 'sort',
} as const;
