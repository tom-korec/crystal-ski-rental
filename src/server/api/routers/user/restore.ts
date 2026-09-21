import { userIdSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Undo a removal (FR-63). */
export const restore = staffProcedure
  .input(userIdSchema)
  .mutation(({ ctx, input }) => ctx.services.users.restore(ctx.session.user, input));
