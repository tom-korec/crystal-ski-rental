import { publicProcedure } from '~/server/api/trpc';

/** Ends the session (FR-2). */
export const signOut = publicProcedure.mutation(({ ctx }) => ctx.services.auth.signOut(ctx));
