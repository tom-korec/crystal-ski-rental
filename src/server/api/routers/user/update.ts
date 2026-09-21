import { userUpdateSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Edits an account, its role and its password (FR-62). The target's role decides who may (BR-33). */
export const update = staffProcedure
  .input(userUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.users.update(ctx.session.user, input));
