import { reservationsBySkiSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Every reservation of one ski, for its detail page (FR-60). */
export const bySki = staffProcedure
  .input(reservationsBySkiSchema)
  .query(({ ctx, input }) => ctx.services.reservations.bySki(input));
