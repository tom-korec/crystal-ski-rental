import { profileUpdateSchema } from '~/lib/profile-schema';
import { protectedProcedure } from '~/server/api/trpc';

/** Name only: the e-mail is the sign-in identifier and nothing verifies a new one (FR-4). */
export const updateProfile = protectedProcedure
  .input(profileUpdateSchema)
  .mutation(({ ctx, input }) => ctx.services.auth.updateProfile(ctx.session.user.id, input));
