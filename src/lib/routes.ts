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
export const ACCEPT_TERMS = '/accept-terms';
export const SIGN_IN = '/sign-in';
export const FORGOT_PASSWORD = '/forgot-password';
export const RESET_PASSWORD = '/reset-password';
export const SEARCH = '/search';
export const SITEMAP = '/sitemap.xml';
export const STORES = '/stores';
export const RESERVE = '/reserve';

/**
 * The pages a customer shops on, public for visitors and under /app once signed in, so a signed-in
 * customer keeps the header and links of their own area.
 */
export const SHOP_ROUTES = {
  public: { search: SEARCH, stores: STORES, reserve: RESERVE },
  app: { search: APP_HOME, stores: APP_STORES, reserve: APP_RESERVE },
} as const;

export type ShopArea = keyof typeof SHOP_ROUTES;
export type ShopRoutes = (typeof SHOP_ROUTES)[ShopArea];

/** The public page of each legal document (FR-7). */
export const LEGAL_ROUTES = {
  terms: '/terms',
  privacy: '/privacy',
  rentalAgreement: '/rental-agreement',
} as const;

export function staffSkiRoute(id: string): string {
  return `${STAFF_SKIS}/${id}`;
}

/** The public stores page, on one store's tab when named. */
export function storeRoute(id?: string): string {
  return id ? `${STORES}?${SEARCH_PARAMS.store}=${id}` : STORES;
}

/** The stores page with one store's tab open. */
export function appStoreRoute(id: string): string {
  return `${APP_STORES}?${SEARCH_PARAMS.store}=${id}`;
}

/** Query parameters the fleet keeps its filters in; only the ones other pages link with are named here. */
export const FLEET_PARAMS = { store: 'store', model: 'model' } as const;

/** The fleet, narrowed to one store or one model. */
export function staffFleetRoute(filter: { storeId?: string; modelId?: string }): string {
  const params = new URLSearchParams();
  if (filter.storeId) params.set(FLEET_PARAMS.store, filter.storeId);
  if (filter.modelId) params.set(FLEET_PARAMS.model, filter.modelId);
  return `${STAFF_SKIS}?${params.toString()}`;
}

/** The stores page, open on one store's tab. */
export function staffStoreRoute(id: string): string {
  return `${STAFF_STORES}?${SEARCH_PARAMS.store}=${id}`;
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
