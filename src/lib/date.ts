// Whole-day dates in UTC (NFR-6). A rental has no time of day, so the wire format is `YYYY-MM-DD` and
// the server widens it to a UTC-midnight `Date` at the edge.
//
// The trap this avoids: a `Date` picked in a calendar is *local* midnight, which `toISOString` turns
// into the previous day anywhere east of Greenwich. Date libraries default to local time, which is
// exactly what these must not do, so there is none.

/** Exact, because UTC has no daylight-saving changes. */
const DAY_MS = 86_400_000;

/** `YYYY-MM-DD`. */
export type DateString = string;

/** Assumes the input already passed validation. */
export function toUtcDate(value: DateString): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateString(date: Date): DateString {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function todayDateString(): DateString {
  return toDateString(todayUtc());
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addDays(value: DateString, days: number): DateString {
  return toDateString(addUtcDays(toUtcDate(value), days));
}

/** Ranges are half-open, so this is the rental length: the 10th to the 12th is two days. */
export function utcDaysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/**
 * A stored rental as a customer reads it. The stored end is exclusive, so the last day they hold the
 * skis is the day before it.
 */
export function rentalPeriod(range: { startDate: Date; endDate: Date }): { lastDay: Date; days: number } {
  return {
    lastDay: addUtcDays(range.endDate, -1),
    days: utcDaysBetween(range.startDate, range.endDate),
  };
}

// The calendar widget works in local-midnight `Date`s, which must never go through `toDateString`.
// These read and write the local calendar fields instead.

export function fromCalendarDate(date: Date): DateString {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toCalendarDate(value: DateString): Date {
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}
