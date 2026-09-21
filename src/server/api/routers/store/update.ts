import { storeUpdateSchema } from '~/lib/store-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Edits a store's details and its weekly opening hours (FR-12, BR-7). */
export const update = adminProcedure
  .input(storeUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.stores.update(input));
