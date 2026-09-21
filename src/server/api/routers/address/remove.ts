import { addressRemoveSchema } from '~/lib/address-schema';
import { userProcedure } from '~/server/api/trpc';

/** Removing an address that is not there is not an error: the outcome is the same (FR-6). */
export const remove = userProcedure
  .input(addressRemoveSchema)
  .mutation(({ ctx, input }) => ctx.services.addresses.remove(ctx.session.user.id, input));
