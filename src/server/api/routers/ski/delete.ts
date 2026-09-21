import { idSchema } from '~/lib/id-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Removes a ski outright, or soft-deletes it once it has history (BR-31, BR-32). */
export const remove = staffProcedure
  .input(idSchema)
  .mutation(({ ctx, input }) => ctx.services.skis.delete(ctx.session.user, input));
