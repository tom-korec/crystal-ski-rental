import { publicProcedure } from '~/server/api/trpc';

/** Brands with how many models each has. Public: the search filters use them (FR-10). */
export const list = publicProcedure.query(({ ctx }) => ctx.services.brands.list());
