import { userIdSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** One account with its addresses. Removed ones too, so a reservation history still opens (FR-6). */
export const byId = staffProcedure.input(userIdSchema).query(({ ctx, input }) => ctx.services.users.byId(input));
