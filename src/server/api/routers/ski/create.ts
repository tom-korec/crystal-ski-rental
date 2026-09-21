import { skiCreateSchema } from '~/lib/ski-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Adds a ski to the fleet (FR-21). A manager may only add one at their own store (FR-64). */
export const create = staffProcedure
  .input(skiCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.skis.create(ctx.session.user, input));
