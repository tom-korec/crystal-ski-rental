import { brandUpdateSchema } from '~/lib/brand-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Renames a brand (FR-10). */
export const update = adminProcedure
  .input(brandUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.brands.update(input));
