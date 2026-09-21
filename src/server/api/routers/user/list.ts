import { userListSchema } from '~/lib/user-schema';
import { staffProcedure } from '~/server/api/trpc';

/** Accounts in use, or only removed ones, which is where a restore starts (FR-61). */
export const list = staffProcedure.input(userListSchema).query(({ ctx, input }) => ctx.services.users.list(input));
