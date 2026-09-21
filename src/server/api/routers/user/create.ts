import { userCreateSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Staff create customer accounts; only an admin creates staff ones (FR-62). */
export const create = staffProcedure
  .input(userCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.users.create(ctx.session.user, input));
