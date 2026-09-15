import { describe, expect, it } from 'vitest';

import {
  canWriteRating,
  editWindowEndsAt,
  modelRatingAccess,
  type RatingAccess,
  ratingAction,
  reservationRatingAccess,
} from '~/lib/rating-rules';
import { RESERVATION_STATUSES } from '~/lib/reservation-lifecycle';

const at = (iso: string) => new Date(iso);
const SUBMITTED = at('2026-12-17T10:00:00Z');
const MINUTES = (minutes: number) => new Date(SUBMITTED.getTime() + minutes * 60_000);

describe('editWindowEndsAt', () => {
  it('is one hour after the window opened', () => {
    expect(editWindowEndsAt(SUBMITTED).toISOString()).toBe('2026-12-17T11:00:00.000Z');
  });
});

describe('reservationRatingAccess', () => {
  const returned = { status: 'RETURNED' as const };

  it.each(RESERVATION_STATUSES.filter((status) => status !== 'RETURNED'))('is not eligible while %s', (status) => {
    expect(reservationRatingAccess({ status }, null, SUBMITTED)).toBe('notEligible');
  });

  it('can be created once returned', () => {
    expect(reservationRatingAccess(returned, null, SUBMITTED)).toBe('create');
  });

  it.each([
    [0, 'edit'],
    [59, 'edit'],
    [59.99, 'edit'],
    [60, 'locked'],
    [60 * 24 * 90, 'locked'],
  ] as const)('%d minutes after submitting → %s', (minutes, expected) => {
    expect(reservationRatingAccess(returned, { createdAt: SUBMITTED }, MINUTES(minutes))).toBe(expected);
  });
});

describe('modelRatingAccess', () => {
  const rental = (id: string, returnedAt: string) => ({ id, status: 'RETURNED' as const, returnedAt: at(returnedAt) });

  const FIRST = rental('r-first', '2026-12-17T09:00:00Z');
  const rating = { reservationId: FIRST.id, windowStartedAt: SUBMITTED };

  it('is not eligible through a reservation that has not been returned', () => {
    expect(modelRatingAccess({ id: 'r', status: 'ACTIVE', returnedAt: null }, null, SUBMITTED)).toBe('notEligible');
  });

  it('can be created through any returned reservation of the model', () => {
    expect(modelRatingAccess(FIRST, null, SUBMITTED)).toBe('create');
  });

  it.each([
    [59, 'edit'],
    [60, 'locked'],
  ] as const)('through the reservation that opened the window, %d minutes later → %s', (minutes, expected) => {
    expect(modelRatingAccess(FIRST, rating, MINUTES(minutes))).toBe(expected);
  });

  it('reopens through a rental returned after the window opened', () => {
    const later = rental('r-later', '2027-01-05T15:00:00Z');

    expect(modelRatingAccess(later, rating, at('2027-01-05T16:00:00Z'))).toBe('reopen');
  });

  it('stays locked through an older rental that was returned before the window opened', () => {
    const older = rental('r-older', '2026-11-02T15:00:00Z');

    expect(modelRatingAccess(older, rating, MINUTES(5))).toBe('locked');
  });

  it('locks again an hour after being reopened', () => {
    const later = rental('r-later', '2027-01-05T15:00:00Z');
    const reopened = { reservationId: later.id, windowStartedAt: at('2027-01-05T16:00:00Z') };

    expect(modelRatingAccess(later, reopened, at('2027-01-05T16:59:00Z'))).toBe('edit');
    expect(modelRatingAccess(later, reopened, at('2027-01-05T17:00:00Z'))).toBe('locked');
    // And the first rental cannot be used to reopen it again.
    expect(modelRatingAccess(FIRST, reopened, at('2027-01-05T17:05:00Z'))).toBe('locked');
  });
});

describe('canWriteRating', () => {
  it.each([
    ['create', true],
    ['edit', true],
    ['reopen', true],
    ['locked', false],
    ['notEligible', false],
  ] satisfies [RatingAccess, boolean][])('%s → %s', (access, expected) => {
    expect(canWriteRating(access)).toBe(expected);
  });
});

describe('ratingAction', () => {
  it.each<[RatingAccess, RatingAccess, ReturnType<typeof ratingAction>]>([
    ['create', 'create', 'rate'],
    ['create', 'reopen', 'rate'],
    ['locked', 'reopen', 'rate'],
    ['create', 'locked', 'rate'],
    ['edit', 'edit', 'edit'],
    ['edit', 'locked', 'edit'],
    ['locked', 'edit', 'edit'],
    ['locked', 'locked', null],
    ['notEligible', 'notEligible', null],
  ])('rental %s and model %s give %s', (rental, model, action) => {
    expect(ratingAction(rental, model)).toBe(action);
  });
});
