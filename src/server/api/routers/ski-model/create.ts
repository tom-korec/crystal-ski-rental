import { skiModelCreateSchema } from '~/lib/ski-model-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Admins only. The model carries the price every ski of it is rented at (FR-11, BR-5). */
export const create = adminProcedure
  .input(skiModelCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.skiModels.create(input));
