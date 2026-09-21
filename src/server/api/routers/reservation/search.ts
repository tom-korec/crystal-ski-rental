import { reservationSearchSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Staff looking reservations up by customer or code, newest first (FR-65). */
export const search = staffProcedure
  .input(reservationSearchSchema)
  .query(({ ctx, input }) => ctx.services.reservations.search(input));
