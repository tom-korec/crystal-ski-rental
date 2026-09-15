import { isStaff } from '~/lib/roles';

export const LANDING = '/';
export const APP_HOME = '/app';
export const APP_RESERVATIONS = '/app/reservations';
export const APP_STORES = '/app/stores';
export const APP_RESERVE = '/app/reserve';
export const STAFF_HOME = '/staff';
export const STAFF_RESERVATIONS = '/staff/reservations';
export const STAFF_SKIS = '/staff/skis';
export const STAFF_MODELS = '/staff/models';
export const STAFF_STORES = '/staff/stores';
export const STAFF_ACCOUNTS = '/staff/accounts';
export const PROFILE = '/profile';

export function staffSkiRoute(id: string): string {
  return `${STAFF_SKIS}/${id}`;
}

/** The stores page with one store's tab open. */
export function appStoreRoute(id: string): string {
  return `${APP_STORES}?${SEARCH_PARAMS.store}=${id}`;
}

export function staffReservationRoute(id: string): string {
  return `${STAFF_RESERVATIONS}/${id}`;
}

export function staffAccountRoute(id: string): string {
  return `${STAFF_ACCOUNTS}/${id}`;
}

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
