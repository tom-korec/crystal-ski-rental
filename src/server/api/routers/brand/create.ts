import { brandCreateSchema } from '~/lib/brand-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Admins only (FR-10). */
export const create = adminProcedure
  .input(brandCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.brands.create(input));
