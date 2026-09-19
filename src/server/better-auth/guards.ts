import 'server-only';

import { redirect } from 'next/navigation';

import { hasAcceptedCurrentTerms } from '~/lib/legal';
import { isAdmin, isCustomer, isStaff } from '~/lib/roles';
import { ACCEPT_TERMS, APP_HOME, homeForRole, SIGN_IN, STAFF_HOME } from '~/lib/routes';

import { getSession } from './server';

// Page guards (FR-5). They protect pages, not data: every tRPC procedure checks the role again,
// because the API is reachable without loading any page. A signed-in user in the wrong area is
// redirected to their own rather than shown an error, so a stale bookmark is not a dead end.

export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

interface RequireUserOptions {
  /** Only for the page where a customer accepts the current Terms and Privacy policy. */
  allowPendingTerms?: boolean;
}

/**
 * The signed-in user, or a redirect to the sign-in page. A customer who has
 * not accepted the current Terms and Privacy policy is sent to accept them first (FR-7).
 */
export async function requireUser({ allowPendingTerms = false }: RequireUserOptions = {}) {
  const user = (await getSession())?.user;

  // A deleted account's cookie stays valid until it expires or its sessions are removed.
  if (!user || user.deletedAt) redirect(SIGN_IN);

  if (!allowPendingTerms && isCustomer(user.role) && !hasAcceptedCurrentTerms(user)) redirect(ACCEPT_TERMS);

  return user;
}

export async function requireCustomer() {
  const user = await requireUser();

  if (isStaff(user.role)) redirect(STAFF_HOME);

  return user;
}

export async function requireStaff() {
  const user = await requireUser();

  if (!isStaff(user.role)) redirect(APP_HOME);

  return user;
}

export async function requireAdmin() {
  const user = await requireStaff();

  if (!isAdmin(user.role)) redirect(STAFF_HOME);

  return user;
}

/**
 * For the public shop pages (search, stores, reservation): a signed-in customer continues on the same
 * page in their own area, with the same query, and staff go to their home.
 */
export async function redirectSignedInShopper(appPath: string, searchParams: PageSearchParams) {
  const user = (await getSession())?.user;
  if (!user || user.deletedAt) return;

  if (isStaff(user.role)) redirect(STAFF_HOME);

  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(await searchParams)) {
    for (const item of [value ?? []].flat()) query.append(name, item);
  }
  redirect(query.size > 0 ? `${appPath}?${query.toString()}` : appPath);
}

/** For the landing page: a signed-in visitor goes straight to their home. */
export async function redirectIfSignedIn() {
  const user = (await getSession())?.user;

  if (user && !user.deletedAt) redirect(homeForRole(user.role));
}
