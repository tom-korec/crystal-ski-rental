import { describe, expect, it } from 'vitest';

import { clientErrorMessage, INTERNAL_ERROR_MESSAGE, isOverlapViolation } from '~/server/api/errors';

import { Prisma } from '../../../generated/prisma/client';

const LEAK = 'Invalid `prisma.reservation.create()` invocation: Unique constraint failed on the fields: (`skiId`)';

describe('clientErrorMessage', () => {
  it('masks an unhandled error in production', () => {
    expect(clientErrorMessage('INTERNAL_SERVER_ERROR', LEAK, true)).toBe(INTERNAL_ERROR_MESSAGE);
  });

  it('keeps the detail in development, where it is the point of a local reproduction', () => {
    expect(clientErrorMessage('INTERNAL_SERVER_ERROR', LEAK, false)).toBe(LEAK);
  });

  it.each(['NOT_FOUND', 'CONFLICT', 'BAD_REQUEST', 'FORBIDDEN', 'UNAUTHORIZED'] as const)(
    'keeps a deliberate %s message in production',
    (code) => {
      expect(clientErrorMessage(code, 'That ski is already booked for those dates.', true)).toBe(
        'That ski is already booked for those dates.',
      );
    },
  );
});

describe('isOverlapViolation', () => {
  // The shape Prisma 7 with the pg adapter produces for SQLSTATE 23P01.
  const driverError = (constraint: string) =>
    new Prisma.PrismaClientKnownRequestError('Invalid `db.reservation.create()` invocation', {
      code: 'P2039',
      clientVersion: '7',
      meta: {
        modelName: 'Reservation',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            code: '23P01',
            message: `conflicting key value violates exclusion constraint "${constraint}"`,
          },
        },
      },
    });

  it('recognises the double-booking constraint', () => {
    expect(isOverlapViolation(driverError('reservation_no_overlap'))).toBe(true);
  });

  it('ignores other constraint violations and other errors', () => {
    expect(isOverlapViolation(driverError('some_other_constraint'))).toBe(false);
    expect(isOverlapViolation(new Error('reservation_no_overlap'))).toBe(false);
    expect(isOverlapViolation(null)).toBe(false);
  });
});
