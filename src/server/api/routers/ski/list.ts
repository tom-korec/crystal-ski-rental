import { skiListSchema } from '~/lib/ski-schema';
import { staffProcedure } from '~/server/api/trpc';

/** The fleet, including skis taken out of rental (FR-20). */
export const list = staffProcedure.input(skiListSchema).query(({ ctx, input }) => ctx.services.skis.list(input));
