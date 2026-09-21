import { skiSearchSchema } from '~/lib/ski-schema';
import { publicProcedure } from '~/server/api/trpc';

/** The customer search (FR-30…34). Public, so visitors can browse before they have an account (FR-37). */
export const search = publicProcedure.input(skiSearchSchema).query(({ ctx, input }) => ctx.services.skis.search(input));
