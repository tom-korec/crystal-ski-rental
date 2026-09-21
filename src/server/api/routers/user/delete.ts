import { userIdSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Soft delete, with the sessions dropped so the sign-out is immediate (FR-63, BR-33). */
export const remove = staffProcedure
  .input(userIdSchema)
  .mutation(({ ctx, input }) => ctx.services.users.delete(ctx.session.user, input));
