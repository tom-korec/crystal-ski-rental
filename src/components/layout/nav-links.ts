import { isAdmin, isStaff } from '~/lib/roles';
import {
  APP_HOME,
  APP_RESERVATIONS,
  APP_STORES,
  SEARCH,
  STAFF_ACCOUNTS,
  STAFF_MODELS,
  STAFF_RESERVATIONS,
  STAFF_STORES,
  STAFF_HOME,
  STAFF_SKIS,
  STORES,
} from '~/lib/routes';

export interface NavLink {
  href: string;
  labelKey: 'findSkis' | 'myReservations' | 'stores' | 'frontDesk' | 'reservations' | 'fleet' | 'accounts' | 'models';
  testId: string;
  /** Also current on pages below it, such as a ski's detail page under the fleet. */
  includesSubpages?: boolean;
}

/** The header links for a signed-in account's role, or for a visitor. */
export function navLinksFor(account: { role?: string | null } | null): NavLink[] {
  if (!account) {
    return [
      { href: SEARCH, labelKey: 'findSkis', testId: 'nav-find-skis' },
      { href: STORES, labelKey: 'stores', testId: 'nav-stores' },
    ];
  }

  return isStaff(account.role)
    ? [
        { href: STAFF_HOME, labelKey: 'frontDesk', testId: 'nav-front-desk' },
        { href: STAFF_RESERVATIONS, labelKey: 'reservations', testId: 'nav-reservations', includesSubpages: true },
        { href: STAFF_SKIS, labelKey: 'fleet', testId: 'nav-fleet', includesSubpages: true },
        { href: STAFF_ACCOUNTS, labelKey: 'accounts', testId: 'nav-accounts', includesSubpages: true },
        // Admin only; the page guard turns a manager away as well.
        { href: STAFF_STORES, labelKey: 'stores', testId: 'nav-stores' },
        ...(isAdmin(account.role) ? [{ href: STAFF_MODELS, labelKey: 'models' as const, testId: 'nav-models' }] : []),
      ]
    : [
        { href: APP_HOME, labelKey: 'findSkis', testId: 'nav-find-skis' },
        { href: APP_RESERVATIONS, labelKey: 'myReservations', testId: 'nav-my-reservations' },
        { href: APP_STORES, labelKey: 'stores', testId: 'nav-stores' },
      ];
}
