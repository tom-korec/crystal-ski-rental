import type { Prisma } from '../../../generated/prisma/client';

/**
 * Reservation items that occupy a ski on any day of `[startDate, endDate)`. Shared by the search and the
 * booking so they cannot disagree, and equivalent to the `reservation_item_no_overlap` constraint.
 */
export function overlappingItem(startDate: Date, endDate: Date): Prisma.ReservationItemWhereInput {
  return {
    holdsDates: true,
    startDate: { lt: endDate },
    endDate: { gt: startDate },
  };
}
