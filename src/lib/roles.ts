import { z } from 'zod';

// Mirrors the Prisma `Role` enum without importing server code, so client components can use it.

export const roleSchema = z.enum(['USER', 'MANAGER', 'ADMIN']);

export type Role = z.infer<typeof roleSchema>;

/** Takes a plain string because that is how the session carries the role. */
export function isCustomer(role?: string | null): boolean {
  return role === 'USER';
}

/** Managers and admins. ADMIN is a superset of MANAGER, so most staff checks want this. */
export function isStaff(role?: string | null): boolean {
  return role === 'MANAGER' || role === 'ADMIN';
}

export function isAdmin(role?: string | null): boolean {
  return role === 'ADMIN';
}
