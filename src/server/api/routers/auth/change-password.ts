import { passwordChangeSchema } from '~/lib/profile-schema';
import { protectedProcedure } from '~/server/api/trpc';

/** Requires the current password, and re-issues this session's cookie (FR-4). */
export const changePassword = protectedProcedure
  .input(passwordChangeSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.changePassword(input, ctx));
