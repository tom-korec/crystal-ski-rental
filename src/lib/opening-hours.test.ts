import { describe, expect, it } from 'vitest';

import {
  closedRentalDays,
  formatOpeningHours,
  hoursOn,
  OPENING_HOURS_FIELDS,
  openingHoursSchema,
  parseOpeningHours,
  rentalDays,
  specialRentalDays,
  type StoreHours,
  weekdayOf,
} from '~/lib/opening-hours';

const store: StoreHours = {
  ...(Object.fromEntries(OPENING_HOURS_FIELDS.map((field) => [field, '8:00-16:30'])) as Record<
    (typeof OPENING_HOURS_FIELDS)[number],
    string | null
  >),
  openingHoursSunday: null,
  specialDays: [
    { date: '2026-12-25', hours: null, name: 'Christmas Day' },
    { date: '2026-11-01', hours: '9:00-12:00', name: "All Saints' Day" },
  ],
};

describe('parseOpeningHours', () => {
  it.each([
    ['8:00-16:30', [{ from: 480, to: 990 }]],
    [
      '8:00-12:00;13:00-20:00',
      [
        { from: 480, to: 720 },
        { from: 780, to: 1200 },
      ],
    ],
    ['0:00-24:00', [{ from: 0, to: 1440 }]],
  ])('reads %j', (value, intervals) => {
    expect(parseOpeningHours(value)).toEqual(intervals);
  });

  it.each(['8-16', '8:00 - 16:00', '16:00-8:00', '8:00-12:00;11:00-14:00', '8:00-12:00;', '25:00-26:00', 'closed'])(
    'refuses %j',
    (value) => {
      expect(parseOpeningHours(value)).toBeNull();
    },
  );
});

describe('openingHoursSchema', () => {
  it.each([
    [' 8:00 – 12:00 ; 13:00 – 20:00 ', '8:00-12:00;13:00-20:00'],
    ['', null],
    [null, null],
  ])('stores %j as %j', (input, stored) => {
    expect(openingHoursSchema.parse(input)).toBe(stored);
  });

  it('refuses hours out of order', () => {
    expect(openingHoursSchema.safeParse('13:00-20:00;8:00-12:00').success).toBe(false);
  });
});

describe('formatOpeningHours', () => {
  it('writes intervals for people, and nothing for a closed day', () => {
    expect(formatOpeningHours('8:00-12:00;13:00-20:00')).toBe('8:00 – 12:00, 13:00 – 20:00');
    expect(formatOpeningHours(null)).toBeNull();
  });
});

describe('hoursOn', () => {
  it('uses the weekday, Monday first', () => {
    expect(weekdayOf('2026-11-02')).toBe(0);
    expect(hoursOn(store, '2026-11-08')).toMatchObject({ hours: null, special: null });
    expect(hoursOn(store, '2026-11-09')).toMatchObject({ hours: '8:00-16:30', special: null });
  });

  it('lets a special day override the weekday, even to open a Sunday', () => {
    expect(hoursOn(store, '2026-11-01')).toMatchObject({ hours: '9:00-12:00', special: { name: "All Saints' Day" } });
    expect(hoursOn(store, '2026-12-25')).toMatchObject({ hours: null, special: { name: 'Christmas Day' } });
  });
});

describe('rentalDays', () => {
  it('checks the first and the last day, the stored end being exclusive', () => {
    const days = rentalDays(store, { startDate: '2026-12-22', endDate: '2026-12-26' });
    expect(days.pickup.date).toBe('2026-12-22');
    expect(days.return.date).toBe('2026-12-25');
    expect(closedRentalDays(days).map((day) => day.date)).toEqual(['2026-12-25']);
  });

  it('allows a special day with hours, and flags it', () => {
    const days = rentalDays(store, { startDate: '2026-11-01', endDate: '2026-11-04' });
    expect(closedRentalDays(days)).toEqual([]);
    expect(specialRentalDays(days).map((day) => day.date)).toEqual(['2026-11-01']);
  });

  it('names a one-day rental on a closed day once', () => {
    expect(closedRentalDays(rentalDays(store, { startDate: '2026-12-25', endDate: '2026-12-26' }))).toHaveLength(1);
  });
});
