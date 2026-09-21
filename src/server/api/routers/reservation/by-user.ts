import { reservationsByUserSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Every reservation of one customer, for their account page (FR-60). */
export const byUser = staffProcedure
  .input(reservationsByUserSchema)
  .query(({ ctx, input }) => ctx.services.reservations.byUser(input));
