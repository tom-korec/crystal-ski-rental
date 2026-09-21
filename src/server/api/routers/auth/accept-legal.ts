import { protectedProcedure } from '~/server/api/trpc';

/** A customer accepts the current Terms and Privacy policy, e.g. after they changed (FR-7). */
export const acceptLegal = protectedProcedure.mutation(({ ctx }) => ctx.services.auth.acceptLegal(ctx.session.user.id));
