import { idSchema } from '~/lib/id-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Refused while any ski still uses the model, removed ones included (FR-13). */
export const remove = adminProcedure.input(idSchema).mutation(({ ctx, input }) => ctx.services.skiModels.delete(input));
