import { isAdmin, type Role } from '~/lib/roles';

/**
 * Which accounts a staff member may create, change, delete or restore (FR-61, FR-62). Managers run the
 * customer roster; staff accounts belong to admins, otherwise any manager could promote a colleague.
 *
 * Call it with the target's current role, and again with the requested role when a change would set
 * one, or "promote this customer to admin" would do what "edit this admin" refuses.
 */
export function mayManageAccount(actorRole: string | null | undefined, targetRole: Role): boolean {
  return isAdmin(actorRole) || targetRole === 'USER';
}
