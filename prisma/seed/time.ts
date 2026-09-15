import { addUtcDays, todayUtc } from '../../src/lib/date';

// The data files never hold a calendar date, so the demo never goes stale: days count from the day of
// seeding, and moments are either a day plus a UTC time, or minutes before the moment of seeding.

export const NOW = new Date();

/** Midnight UTC, `offset` days from today. */
export function day(offset: number): Date {
  return addUtcDays(todayUtc(), offset);
}

const DAY_AND_TIME = /^(-?\d+) (\d{2}):(\d{2})$/;
const MINUTES_AGO = /^(\d+)m$/;

/** `"-12 09:30"` is 09:30 UTC twelve days ago; `"40m"` is forty minutes before seeding. */
export function moment(value: string): Date {
  const minutes = MINUTES_AGO.exec(value);
  if (minutes) return new Date(NOW.getTime() - Number(minutes[1]) * 60_000);

  const match = DAY_AND_TIME.exec(value);
  if (!match) throw new Error(`Not a seed moment: ${value}`);

  const [, offset, hours, mins] = match;
  const date = day(Number(offset));
  date.setUTCHours(Number(hours), Number(mins));
  return date;
}

export const MOMENT_PATTERN = new RegExp(`${DAY_AND_TIME.source}|${MINUTES_AGO.source}`);
