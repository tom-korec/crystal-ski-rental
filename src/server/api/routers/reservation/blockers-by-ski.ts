import { reservationsBySkiSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** What stands in the way of taking a ski out of rental, moving it or deleting it (BR-22, BR-30, BR-31). */
export const blockersBySki = staffProcedure
  .input(reservationsBySkiSchema.pick({ skiId: true }))
  .query(({ ctx, input }) => ctx.services.reservations.blockersBySki(input));
