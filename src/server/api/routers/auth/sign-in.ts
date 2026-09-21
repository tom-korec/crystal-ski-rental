import { signInSchema } from '~/lib/auth-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Signs in with e-mail and password (FR-2). An unconfirmed address is refused (FR-9). */
export const signIn = publicProcedure
  .input(signInSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.signIn(input, ctx));
