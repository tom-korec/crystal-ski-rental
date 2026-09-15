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

export interface StaffActor {
  role?: string | null;
  /** A manager's own store; empty for admins. */
  storeId?: string | null;
}

/**
 * Whether a staff member may add, change or delete skis at a store (FR-64). Admins may anywhere; a manager
 * only at their own store, so a manager without one changes nothing. Everyone on staff can still see
 * every store's skis.
 */
export function mayChangeSkisAt(actor: StaffActor, storeId: string): boolean {
  if (isAdmin(actor.role)) return true;
  return actor.role === 'MANAGER' && actor.storeId === storeId;
}

/**
 * The store an account keeps after a change of role or store: managers need one, nobody else has one.
 * Returns null for a manager left without a store, which the caller refuses.
 */
export function storeForRole(role: Role, storeId: string | null | undefined): string | null {
  return role === 'MANAGER' ? (storeId ?? null) : null;
}
