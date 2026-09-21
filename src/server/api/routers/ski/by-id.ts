import { idSchema } from '~/lib/id-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Staff detail (FR-23). Returns deleted skis too, because past reservations still point at them. */
export const byId = staffProcedure.input(idSchema).query(({ ctx, input }) => ctx.services.skis.byId(input));
