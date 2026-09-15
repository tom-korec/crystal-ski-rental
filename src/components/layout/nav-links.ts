import { isAdmin, isStaff } from '~/lib/roles';
import {
  APP_HOME,
  APP_RESERVATIONS,
  APP_STORES,
  STAFF_ACCOUNTS,
  STAFF_CATALOG,
  STAFF_HOME,
  STAFF_SKIS,
} from '~/lib/routes';

export interface NavLink {
  href: string;
  labelKey: 'findSkis' | 'myReservations' | 'stores' | 'frontDesk' | 'fleet' | 'accounts' | 'catalog';
  testId: string;
  /** Also current on pages below it, such as a ski's detail page under the fleet. */
  includesSubpages?: boolean;
}

/** The header links for a role. Pages are added here as they exist. */
export function navLinksFor(role?: string | null): NavLink[] {
  return isStaff(role)
    ? [
        { href: STAFF_HOME, labelKey: 'frontDesk', testId: 'nav-front-desk' },
        { href: STAFF_SKIS, labelKey: 'fleet', testId: 'nav-fleet', includesSubpages: true },
        { href: STAFF_ACCOUNTS, labelKey: 'accounts', testId: 'nav-accounts', includesSubpages: true },
        // Admin only; the page guard turns a manager away as well.
        ...(isAdmin(role) ? [{ href: STAFF_CATALOG, labelKey: 'catalog' as const, testId: 'nav-catalog' }] : []),
      ]
    : [
        { href: APP_HOME, labelKey: 'findSkis', testId: 'nav-find-skis' },
        { href: APP_RESERVATIONS, labelKey: 'myReservations', testId: 'nav-my-reservations' },
        { href: APP_STORES, labelKey: 'stores', testId: 'nav-stores' },
      ];
}
