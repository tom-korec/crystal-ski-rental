import { ratingSchema } from '~/lib/rating-schema';
import { userProcedure } from '~/server/api/trpc';

/** Rates the rental and the ski models of one returned reservation at once (FR-42…44). */
export const rate = userProcedure
  .input(ratingSchema)
  .mutation(({ ctx, input }) => ctx.services.ratings.rate(ctx.session.user.id, input));
