import { modelRatingsSchema } from '~/lib/rating-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Every rating of one model, with the comments and who wrote them, for replying by e-mail (FR-14). */
export const byModel = staffProcedure
  .input(modelRatingsSchema)
  .query(({ ctx, input }) => ctx.services.ratings.byModel(input));
