import { skiUpdateSchema } from '~/lib/ski-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Edits a ski, including taking it out of rental and moving it between stores (BR-22, BR-30). */
export const update = staffProcedure
  .input(skiUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.skis.update(ctx.session.user, input));
