import { reservationByCodeSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** The reservation a customer quotes at the counter (FR-45). Only its id, for opening its page. */
export const byCode = staffProcedure
  .input(reservationByCodeSchema)
  .query(({ ctx, input }) => ctx.services.reservations.byCode(input));
