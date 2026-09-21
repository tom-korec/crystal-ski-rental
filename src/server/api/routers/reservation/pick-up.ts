import { reservationIdSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Staff hand the skis over, on a day within the rental period (BR-11). */
export const pickUp = staffProcedure
  .input(reservationIdSchema)
  .mutation(({ ctx, input }) => ctx.services.reservations.pickUp(input, ctx.session.user.id));
