import { describe, expect, it } from 'vitest';

import { ReservationStatus as DbReservationStatus } from '../../generated/prisma/enums';

import { toUtcDate } from '~/lib/date';
import {
  canCancelAsStore,
  canCancelAsUser,
  canPickUp,
  canReturn,
  isOverduePickup,
  isOverdueReturn,
  isPickupDueToday,
  isReturnDueToday,
  type LifecycleReservation,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from '~/lib/reservation-lifecycle';

const TODAY = toUtcDate('2026-12-17');

/** A rental from `start` up to, not including, `end`. */
function reservation(status: ReservationStatus, start: string, end: string): LifecycleReservation {
  return { status, startDate: toUtcDate(start), endDate: toUtcDate(end) };
}

const OTHER_THAN = (status: ReservationStatus) => RESERVATION_STATUSES.filter((s) => s !== status);

describe('canCancelAsUser', () => {
  it.each([
    ['starts tomorrow', '2026-12-18', '2026-12-20', true],
    ['starts today', '2026-12-17', '2026-12-20', false],
    ['started yesterday', '2026-12-16', '2026-12-20', false],
  ])('a booking that %s → %s', (_, start, end, expected) => {
    expect(canCancelAsUser(reservation('CREATED', start, end), TODAY)).toBe(expected);
  });

  it.each(OTHER_THAN('CREATED'))('never from %s', (status) => {
    expect(canCancelAsUser(reservation(status, '2026-12-20', '2026-12-22'), TODAY)).toBe(false);
  });
});

describe('canCancelAsStore', () => {
  it('allows any booking not yet picked up, including a no-show', () => {
    expect(canCancelAsStore(reservation('CREATED', '2026-12-20', '2026-12-22'))).toBe(true);
    expect(canCancelAsStore(reservation('CREATED', '2026-12-10', '2026-12-12'))).toBe(true);
  });

  it.each(OTHER_THAN('CREATED'))('never from %s', (status) => {
    expect(canCancelAsStore(reservation(status, '2026-12-20', '2026-12-22'))).toBe(false);
  });
});

describe('canPickUp', () => {
  it.each([
    ['before the first day', '2026-12-18', '2026-12-20', false],
    ['on the first day', '2026-12-17', '2026-12-20', true],
    ['on a later day of the rental', '2026-12-15', '2026-12-20', true],
    ['on the last day', '2026-12-15', '2026-12-18', true],
    ['after the last day', '2026-12-10', '2026-12-17', false],
  ])('%s → %s', (_, start, end, expected) => {
    expect(canPickUp(reservation('CREATED', start, end), TODAY)).toBe(expected);
  });

  it.each(OTHER_THAN('CREATED'))('never from %s', (status) => {
    expect(canPickUp(reservation(status, '2026-12-17', '2026-12-20'), TODAY)).toBe(false);
  });
});

describe('canReturn', () => {
  it('allows only picked-up rentals, early or late', () => {
    expect(canReturn(reservation('ACTIVE', '2026-12-15', '2026-12-25'))).toBe(true);
    expect(canReturn(reservation('ACTIVE', '2026-12-01', '2026-12-05'))).toBe(true);
  });

  it.each(OTHER_THAN('ACTIVE'))('never from %s', (status) => {
    expect(canReturn(reservation(status, '2026-12-15', '2026-12-20'))).toBe(false);
  });
});

describe('front desk lists', () => {
  it('flags a pickup due today, and only on its first day', () => {
    expect(isPickupDueToday(reservation('CREATED', '2026-12-17', '2026-12-19'), TODAY)).toBe(true);
    expect(isPickupDueToday(reservation('CREATED', '2026-12-16', '2026-12-19'), TODAY)).toBe(false);
    expect(isPickupDueToday(reservation('ACTIVE', '2026-12-17', '2026-12-19'), TODAY)).toBe(false);
  });

  it('flags an overdue pickup once the first day has passed', () => {
    expect(isOverduePickup(reservation('CREATED', '2026-12-16', '2026-12-19'), TODAY)).toBe(true);
    expect(isOverduePickup(reservation('CREATED', '2026-12-17', '2026-12-19'), TODAY)).toBe(false);
    expect(isOverduePickup(reservation('CANCELLED_BY_STORE', '2026-12-16', '2026-12-19'), TODAY)).toBe(false);
  });

  it('flags a return due on the last day of the rental', () => {
    // Stored end is exclusive: a rental ending the 18th has the 17th as its last day.
    expect(isReturnDueToday(reservation('ACTIVE', '2026-12-15', '2026-12-18'), TODAY)).toBe(true);
    expect(isReturnDueToday(reservation('ACTIVE', '2026-12-15', '2026-12-17'), TODAY)).toBe(false);
    expect(isReturnDueToday(reservation('RETURNED', '2026-12-15', '2026-12-18'), TODAY)).toBe(false);
  });

  it('flags an overdue return once the last day has passed', () => {
    expect(isOverdueReturn(reservation('ACTIVE', '2026-12-14', '2026-12-17'), TODAY)).toBe(true);
    expect(isOverdueReturn(reservation('ACTIVE', '2026-12-14', '2026-12-18'), TODAY)).toBe(false);
    expect(isOverdueReturn(reservation('RETURNED', '2026-12-14', '2026-12-17'), TODAY)).toBe(false);
  });
});

describe('RESERVATION_STATUSES', () => {
  it('matches the database enum', () => {
    expect([...RESERVATION_STATUSES]).toEqual(Object.values(DbReservationStatus));
  });
});
