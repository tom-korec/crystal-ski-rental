import { skiModelListSchema } from '~/lib/ski-model-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Models with their ski counts, optionally of one brand. Public: the search filters use them (FR-11). */
export const list = publicProcedure
  .input(skiModelListSchema)
  .query(({ ctx, input }) => ctx.services.skiModels.list(input));
