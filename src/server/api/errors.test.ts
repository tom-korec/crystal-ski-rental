import { describe, expect, it } from 'vitest';

import { clientErrorMessage, INTERNAL_ERROR_MESSAGE } from '~/server/api/errors';

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
