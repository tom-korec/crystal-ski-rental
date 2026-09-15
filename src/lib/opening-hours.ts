import { z } from 'zod';

import { addDays, type DateString, toUtcDate } from '~/lib/date';
import { dateStringSchema } from '~/lib/rental-range';

// Store opening hours (FR-12, BR-7). Each weekday is written as one or more intervals, e.g.
// "8:00-12:00;13:00-20:00", and no hours at all means closed. Special days override a weekday for one
// date: a public holiday with short hours, or a closure such as Christmas.

export const OPENING_HOURS_MAX_LENGTH = 50;
export const SPECIAL_DAY_NAME_MAX_LENGTH = 60;

/** Monday first, like the week in the store's region. */
export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const OPENING_HOURS_FIELDS = [
  'openingHoursMonday',
  'openingHoursTuesday',
  'openingHoursWednesday',
  'openingHoursThursday',
  'openingHoursFriday',
  'openingHoursSaturday',
  'openingHoursSunday',
] as const;

export type OpeningHoursField = (typeof OPENING_HOURS_FIELDS)[number];

const INTERVAL = /^([01]?\d|2[0-3]):([0-5]\d)-([01]?\d|2[0-4]):([0-5]\d)$/;

export interface Interval {
  /** Minutes after midnight. */
  from: number;
  to: number;
}

/** The intervals of a valid hours string, or null when it is not one. */
export function parseOpeningHours(value: string): Interval[] | null {
  const intervals: Interval[] = [];

  for (const part of value.split(';')) {
    const match = INTERVAL.exec(part);
    if (!match) return null;
    const [, fromHours, fromMinutes, toHours, toMinutes] = match.map(Number);
    const from = (fromHours ?? 0) * 60 + (fromMinutes ?? 0);
    const to = (toHours ?? 0) * 60 + (toMinutes ?? 0);
    const previous = intervals.at(-1);

    // In order, each ending after it starts and after the one before it ends.
    if (to <= from || to > 24 * 60 || (previous && from < previous.to)) return null;
    intervals.push({ from, to });
  }

  return intervals;
}

/**
 * One day's hours as typed: spaces and dash variants are forgiven, and blank means closed (null). Anything
 * else must be intervals in order.
 */
export const openingHoursSchema = z
  .string()
  .nullable()
  .transform((value) => (value ?? '').replace(/\s+/g, '').replace(/[–—]/g, '-') || null)
  .refine((value) => value === null || (value.length <= OPENING_HOURS_MAX_LENGTH && parseOpeningHours(value)), {
    message: 'Write the hours like 8:00-16:30, or 8:00-12:00;13:00-20:00 with a break.',
  });

function formatTime(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** "8:00 – 12:00, 13:00 – 20:00" for people; null for a closed day. */
export function formatOpeningHours(value: string | null): string | null {
  if (value === null) return null;
  const intervals = parseOpeningHours(value);
  if (!intervals) return value;
  return intervals.map(({ from, to }) => `${formatTime(from)} – ${formatTime(to)}`).join(', ');
}

export const specialDaySchema = z.object({
  date: dateStringSchema,
  hours: openingHoursSchema,
  name: z
    .string()
    .trim()
    .max(SPECIAL_DAY_NAME_MAX_LENGTH)
    .nullish()
    .transform((value) => (value === '' || value === undefined ? null : value)),
});

export type SpecialDayInput = z.input<typeof specialDaySchema>;

export interface SpecialDay {
  date: DateString;
  /** Null when the store is closed that day. */
  hours: string | null;
  name: string | null;
}

export type WeeklyHours = Record<OpeningHoursField, string | null>;

export interface StoreHours extends WeeklyHours {
  specialDays: SpecialDay[];
}

export interface DayHours {
  date: DateString;
  hours: string | null;
  /** The special day behind these hours, when it is one. */
  special: SpecialDay | null;
}

/** Monday is 0. */
export function weekdayOf(date: DateString): number {
  return (toUtcDate(date).getUTCDay() + 6) % 7;
}

export function hoursOn(store: StoreHours, date: DateString): DayHours {
  const special = store.specialDays.find((day) => day.date === date) ?? null;
  if (special) return { date, hours: special.hours, special };

  const field = OPENING_HOURS_FIELDS[weekdayOf(date)];
  return { date, hours: field ? store[field] : null, special: null };
}

export interface RentalDays {
  pickup: DayHours;
  /** The last day of the rental: the stored end is exclusive. */
  return: DayHours;
}

/**
 * The days a rental needs the store open: pickup on the first day, return on the last (BR-7). Neither may
 * be closed; a special day with hours is allowed, and worth a warning, since hours may be short.
 */
export function rentalDays(store: StoreHours, range: { startDate: DateString; endDate: DateString }): RentalDays {
  return { pickup: hoursOn(store, range.startDate), return: hoursOn(store, addDays(range.endDate, -1)) };
}

export function closedRentalDays(days: RentalDays): DayHours[] {
  const closed = [days.pickup, days.return].filter((day) => day.hours === null);
  return closed.length === 2 && closed[0]?.date === closed[1]?.date ? closed.slice(0, 1) : closed;
}

export function specialRentalDays(days: RentalDays): DayHours[] {
  const special = [days.pickup, days.return].filter((day) => day.special !== null && day.hours !== null);
  return special.length === 2 && special[0]?.date === special[1]?.date ? special.slice(0, 1) : special;
}
