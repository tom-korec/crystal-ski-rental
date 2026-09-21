import { storeCreateSchema } from '~/lib/store-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Admins only (FR-12). */
export const create = adminProcedure
  .input(storeCreateSchema)
  .mutation(({ ctx, input }) => ctx.services.stores.create(input));
