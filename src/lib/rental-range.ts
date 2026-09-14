import { z } from 'zod';

import { todayUtc, toUtcDate, utcDaysBetween } from '~/lib/date';
import { MAX_RENTAL_DAYS, MIN_RENTAL_DAYS } from '~/lib/pricing';

// The rental window (BR-2), shared by the ski search and the booking: a search is a dry run of a booking.
// Ranges are half-open, `startDate` inclusive and `endDate` exclusive.

export const dateStringSchema = z.iso.date();

export const dateRangeSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
});

export type DateRange = z.infer<typeof dateRangeSchema>;

/** "Not in the past" is judged by whichever clock runs it; the server re-validates and has the last word. */
export function refineRentalRange(range: DateRange, ctx: z.RefinementCtx<DateRange>): void {
  const start = toUtcDate(range.startDate);
  const days = utcDaysBetween(start, toUtcDate(range.endDate));

  if (start < todayUtc()) {
    ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'A rental cannot start in the past.' });
  }

  if (days < MIN_RENTAL_DAYS) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'The return date must be after the pickup date.' });
  } else if (days > MAX_RENTAL_DAYS) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: `A rental can last at most ${MAX_RENTAL_DAYS} days.`,
    });
  }
}

export const rentalRangeSchema = dateRangeSchema.superRefine(refineRentalRange);
