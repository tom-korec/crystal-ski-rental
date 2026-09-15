import { TRPCError } from '@trpc/server';

import { Prisma } from '../../../generated/prisma/client';

// Anticipated failures carry a sentence written for the user. Everything else is a 500 whose text
// is whatever threw, so production replaces it (NFR-5).

export function notFound(message: string): TRPCError {
  return new TRPCError({ code: 'NOT_FOUND', message });
}

export function conflict(message: string): TRPCError {
  return new TRPCError({ code: 'CONFLICT', message });
}

export function badRequest(message: string): TRPCError {
  return new TRPCError({ code: 'BAD_REQUEST', message });
}

/** Past the procedure's role gate, but not allowed on this particular record. */
export function forbidden(message: string): TRPCError {
  return new TRPCError({ code: 'FORBIDDEN', message });
}

// @see https://www.prisma.io/docs/orm/reference/error-reference
const STATUS_BY_PRISMA_CODE = {
  /** Unique constraint. */
  P2002: 'CONFLICT',
  /** Foreign key: a missing reference, or a Restrict relation blocking a delete. */
  P2003: 'BAD_REQUEST',
  /** Record to update or delete not found. */
  P2025: 'NOT_FOUND',
} as const satisfies Record<string, TRPCError['code']>;

type HandledPrismaCode = keyof typeof STATUS_BY_PRISMA_CODE;

/**
 * Rethrows a Prisma error as a user-facing one when a message is given for its code. Used on writes
 * that also check up front: the check gives the better message, this closes the race behind it.
 */
export function rethrowPrismaError(error: unknown, messages: Partial<Record<HandledPrismaCode, string>>): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code in messages) {
    const code = error.code as HandledPrismaCode;

    throw new TRPCError({ code: STATUS_BY_PRISMA_CODE[code], message: messages[code], cause: error });
  }

  throw error;
}

export function isPrismaError(error: unknown, code: HandledPrismaCode): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

/**
 * A write refused by the `reservation_item_no_overlap` exclusion constraint. Prisma has no code of its own for
 * it (the driver's SQLSTATE is 23P01), so the constraint is recognised by name in the error details.
 */
export function isOverlapViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    `${error.message} ${JSON.stringify(error.meta ?? {})}`.includes('reservation_item_no_overlap')
  );
}

export const INTERNAL_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/** The message the browser may see: unhandled failures are masked in production. */
export function clientErrorMessage(code: TRPCError['code'], message: string, isProduction: boolean): string {
  return isProduction && code === 'INTERNAL_SERVER_ERROR' ? INTERNAL_ERROR_MESSAGE : message;
}
