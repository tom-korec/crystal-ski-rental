import { specialDaySetSchema } from '~/lib/store-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Different hours for one date, or a closure. Closing is refused while a rental uses that day (BR-7). */
export const setSpecialDay = adminProcedure
  .input(specialDaySetSchema)
  .mutation(({ ctx, input }) => ctx.services.stores.setSpecialDay(input));
