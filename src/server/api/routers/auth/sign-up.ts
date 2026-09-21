import { signUpSchema } from '~/lib/auth-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Every sign-up is a customer: `role` is not accepted as input (FR-1). */
export const signUp = publicProcedure
  .input(signUpSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.signUp(input, ctx));
