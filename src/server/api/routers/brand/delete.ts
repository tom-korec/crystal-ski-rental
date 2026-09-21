import { idSchema } from '~/lib/id-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Refused while a model still uses the brand (FR-13). */
export const remove = adminProcedure.input(idSchema).mutation(({ ctx, input }) => ctx.services.brands.delete(input));
