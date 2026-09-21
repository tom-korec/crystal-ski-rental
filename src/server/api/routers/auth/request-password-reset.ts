import { passwordResetRequestSchema } from '~/lib/auth-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Asks for a reset link (FR-8). The answer never says whether the address has an account. */
export const requestPasswordReset = publicProcedure
  .input(passwordResetRequestSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.requestPasswordReset(input, ctx));
