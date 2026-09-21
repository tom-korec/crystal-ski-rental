import { reservationIdSchema } from '~/lib/reservation-schema';
import { isStaff } from '~/lib/roles';
import { protectedProcedure } from '~/server/api/trpc';

/**
 * A customer cancels their own booking before its first day; staff cancel any booking not yet picked
 * up, which is also how a no-show is recorded (BR-11). Which of the two applies is decided here, from
 * the caller's role, and passed on.
 */
export const cancel = protectedProcedure.input(reservationIdSchema).mutation(({ ctx, input }) =>
  ctx.services.reservations.cancel({
    ...input,
    userId: ctx.session.user.id,
    byStore: isStaff(ctx.session.user.role),
  }),
);
