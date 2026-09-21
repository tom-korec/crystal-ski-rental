import { specialDayRemoveSchema } from '~/lib/store-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Back to the store's ordinary hours for that date (BR-7). */
export const removeSpecialDay = adminProcedure
  .input(specialDayRemoveSchema)
  .mutation(({ ctx, input }) => ctx.services.stores.removeSpecialDay(input));
