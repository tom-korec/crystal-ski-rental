import { reservationCreateSchema } from '~/lib/reservation-schema';
import { userProcedure } from '~/server/api/trpc';

/** Books one or more skis from one store for the same days (FR-33, BR-6). */
export const create = userProcedure
  .input(reservationCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.reservations.create(ctx.session.user.id, input));
