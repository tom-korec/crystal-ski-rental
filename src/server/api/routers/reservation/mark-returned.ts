import { reservationIdSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Staff take the skis back, on any day (BR-15). */
export const markReturned = staffProcedure
  .input(reservationIdSchema)
  .mutation(({ ctx, input }) => ctx.services.reservations.markReturned(input, ctx.session.user.id));
