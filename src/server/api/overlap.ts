import { DATE_HOLDING_STATUSES } from '~/lib/reservation-lifecycle';

import type { Prisma } from '../../../generated/prisma/client';

/**
 * Reservations that occupy a ski on any day of `[startDate, endDate)`. Shared by the search and the
 * booking so they cannot disagree, and equivalent to the `reservation_no_overlap` constraint.
 */
export function overlappingReservation(startDate: Date, endDate: Date): Prisma.ReservationWhereInput {
  return {
    status: { in: [...DATE_HOLDING_STATUSES] },
    startDate: { lt: endDate },
    endDate: { gt: startDate },
  };
}
