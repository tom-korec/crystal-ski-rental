import { idSchema } from '~/lib/id-schema';
import { adminProcedure } from '~/server/api/trpc';

/** Refused while the store still has skis, removed ones included (FR-13). */
export const remove = adminProcedure.input(idSchema).mutation(({ ctx, input }) => ctx.services.stores.delete(input));
