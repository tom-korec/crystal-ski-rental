import { isStaff } from '~/lib/roles';
import { APP_HOME, STAFF_HOME } from '~/lib/routes';

export interface NavLink {
  href: string;
  labelKey: 'findSkis' | 'frontDesk';
  testId: string;
}

/** The header links for a role. Pages are added here as they exist. */
export function navLinksFor(role?: string | null): NavLink[] {
  return isStaff(role)
    ? [{ href: STAFF_HOME, labelKey: 'frontDesk', testId: 'nav-front-desk' }]
    : [{ href: APP_HOME, labelKey: 'findSkis', testId: 'nav-find-skis' }];
}
