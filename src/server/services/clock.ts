import { type DateString, todayDateString, todayUtc } from '~/lib/date';

/**
 * The server's clock, injected rather than read from `Date` directly, so rules that depend on "now"
 * — rating edit windows, what counts as overdue — can be tested at a fixed moment (NFR-6).
 */
export interface Clock {
  /** The current moment, for anything stored with a time. */
  now(): Date;
  /** Today as UTC midnight, the form every rental date takes. */
  todayUtc(): Date;
  today(): DateString;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  todayUtc(): Date {
    return todayUtc();
  }

  today(): DateString {
    return todayDateString();
  }
}
