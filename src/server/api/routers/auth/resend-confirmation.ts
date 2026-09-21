import { verificationRequestSchema } from '~/lib/auth-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Asks for a new confirmation link (FR-9). The answer is the same for every address. */
export const resendConfirmation = publicProcedure
  .input(verificationRequestSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.resendConfirmation(input, ctx));
