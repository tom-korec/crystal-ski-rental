import { myReservationsSchema } from '~/lib/reservation-schema';
import { userProcedure } from '~/server/api/trpc';

/** The caller's own reservations, newest first, with their ratings of the models in them (FR-40). */
export const listMine = userProcedure
  .input(myReservationsSchema)
  .query(({ ctx, input }) => ctx.services.reservations.listMine(ctx.session.user.id, input));
