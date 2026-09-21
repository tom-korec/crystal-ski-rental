import { addressSaveSchema } from '~/lib/address-schema';
import { userProcedure } from '~/server/api/trpc';

/** Creates the address of that kind, or replaces it (FR-6). */
export const save = userProcedure
  .input(addressSaveSchema)
  .mutation(({ ctx, input }) => ctx.services.addresses.save(ctx.session.user.id, input));
