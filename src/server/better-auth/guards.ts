import 'server-only';

import { redirect } from 'next/navigation';

import { isAdmin, isStaff } from '~/lib/roles';
import { APP_HOME, homeForRole, LANDING, STAFF_HOME } from '~/lib/routes';

import { getSession } from './server';

// Page guards (FR-5). They protect pages, not data: every tRPC procedure checks the role again,
// because the API is reachable without loading any page. A signed-in user in the wrong area is
// redirected to their own rather than shown an error, so a stale bookmark is not a dead end.

/** The signed-in user, or a redirect to the landing page, which has the sign-in form. */
export async function requireUser() {
  const user = (await getSession())?.user;

  // A deleted account's cookie stays valid until it expires or its sessions are removed.
  if (!user || user.deletedAt) redirect(LANDING);

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

/** For the landing page: a signed-in visitor goes straight to their home. */
export async function redirectIfSignedIn() {
  const user = (await getSession())?.user;

  if (user && !user.deletedAt) redirect(homeForRole(user.role));
}
