import { skiModelUpdateSchema } from '~/lib/ski-model-schema';
import { adminProcedure } from '~/server/api/trpc';

/** A price change applies from the next booking on; existing reservations keep theirs (BR-5). */
export const update = adminProcedure
  .input(skiModelUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.skiModels.update(input));
