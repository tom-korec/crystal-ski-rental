import { idSchema } from '~/lib/id-schema';
import { publicProcedure } from '~/server/api/trpc';

/** One store with its address, contacts and hours (FR-12). */
export const byId = publicProcedure.input(idSchema).query(({ ctx, input }) => ctx.services.stores.byId(input));
