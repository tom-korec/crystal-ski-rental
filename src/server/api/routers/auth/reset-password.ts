import { passwordResetSchema } from '~/lib/auth-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Sets a new password from the link's one-time token (FR-8). */
export const resetPassword = publicProcedure
  .input(passwordResetSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.resetPassword(input));
