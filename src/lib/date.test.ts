import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  addDays,
  addUtcDays,
  fromCalendarDate,
  rentalPeriod,
  toCalendarDate,
  toDateString,
  todayDateString,
  todayUtc,
  toUtcDate,
  utcDaysBetween,
} from '~/lib/date';

describe('toUtcDate', () => {
  it('lands exactly on midnight UTC', () => {
    // The overlap constraint compares these, so a date an hour off would make adjacent rentals collide.
    expect(toUtcDate('2026-12-17').toISOString()).toBe('2026-12-17T00:00:00.000Z');
  });

  it('round-trips through toDateString', () => {
    expect(toDateString(toUtcDate('2026-12-17'))).toBe('2026-12-17');
  });

  it('handles a leap day', () => {
    expect(toUtcDate('2028-02-29').toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });
});

describe('addDays', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2027-03-01', -1, '2027-02-28'],
    ['2026-12-17', 0, '2026-12-17'],
  ])('%s %+d → %s', (from, days, expected) => {
    expect(addDays(from, days)).toBe(expected);
  });

  it('keeps a shifted date at midnight', () => {
    expect(addUtcDays(toUtcDate('2026-12-17'), 5).toISOString()).toBe('2026-12-22T00:00:00.000Z');
  });
});

describe('utcDaysBetween', () => {
  it('counts a half-open range as its length', () => {
    expect(utcDaysBetween(toUtcDate('2026-12-10'), toUtcDate('2026-12-12'))).toBe(2);
  });

  it('is zero for an empty range and negative for a backwards one', () => {
    expect(utcDaysBetween(toUtcDate('2026-12-10'), toUtcDate('2026-12-10'))).toBe(0);
    expect(utcDaysBetween(toUtcDate('2026-12-12'), toUtcDate('2026-12-10'))).toBe(-2);
  });
});

describe('rentalPeriod', () => {
  it('names the last day the skis are held, not the exclusive end that is stored', () => {
    const { lastDay, days } = rentalPeriod({ startDate: toUtcDate('2026-12-10'), endDate: toUtcDate('2026-12-13') });

    expect(toDateString(lastDay)).toBe('2026-12-12');
    expect(days).toBe(3);
  });

  it('describes a one-day rental as starting and ending on the same day', () => {
    const { lastDay, days } = rentalPeriod({ startDate: toUtcDate('2026-12-10'), endDate: toUtcDate('2026-12-11') });

    expect(toDateString(lastDay)).toBe('2026-12-10');
    expect(days).toBe(1);
  });
});

// The calendar helpers are the only ones that touch local time, so they are tested east of
// Greenwich, where local midnight is the previous day in UTC.
describe('in Europe/Bratislava', () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    process.env.TZ = 'Europe/Bratislava';
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it('reads a calendar date as the day that was clicked', () => {
    expect(fromCalendarDate(new Date(2026, 11, 17))).toBe('2026-12-17');
  });

  it('would lose a day if a calendar date went through toDateString', () => {
    const clicked = new Date(2026, 11, 17);

    expect(toDateString(clicked)).toBe('2026-12-16');
    expect(fromCalendarDate(clicked)).toBe('2026-12-17');
  });

  it('round-trips a date string through the calendar', () => {
    const date = toCalendarDate('2026-12-17');

    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 11, 17]);
    expect(fromCalendarDate(date)).toBe('2026-12-17');
  });

  it('crosses a daylight-saving change without dropping or repeating a day', () => {
    // Clocks go forward in Bratislava on 2027-03-28, so that local day is 23 hours long.
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28');
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29');
    expect(utcDaysBetween(toUtcDate('2027-03-27'), toUtcDate('2027-03-29'))).toBe(2);
  });
});

describe('todayUtc', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTz;
  });

  it('is the UTC day, not the local one', () => {
    // 00:30 on the 18th in Bratislava is still the 17th in UTC.
    process.env.TZ = 'Europe/Bratislava';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-17T23:30:00Z'));

    expect(todayDateString()).toBe('2026-12-17');
  });

  it('is midnight, so today compares equal to a stored date for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-17T14:45:12.345Z'));

    expect(todayUtc().getTime()).toBe(toUtcDate('2026-12-17').getTime());
  });
});
