import { reservationIdSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** One reservation in full, for its staff page (FR-66). */
export const byId = staffProcedure
  .input(reservationIdSchema)
  .query(({ ctx, input }) => ctx.services.reservations.byId(input));
