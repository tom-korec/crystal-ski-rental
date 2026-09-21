import { publicProcedure } from '~/server/api/trpc';

/** Every store with its hours and ski count. Public: visitors need them before signing up (FR-12). */
export const list = publicProcedure.query(({ ctx }) => ctx.services.stores.list());
