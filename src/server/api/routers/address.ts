import { addressRemoveSchema, addressSaveSchema } from '~/lib/address-schema';
import { customerAddressSelect } from '~/server/api/selects';
import { createTRPCRouter, userProcedure } from '~/server/api/trpc';

// A customer's own mailing and invoice addresses (FR-6). There is no id to pass: each customer has at
// most one address of each kind, so the kind is the address.

export const addressRouter = createTRPCRouter({
  mine: userProcedure.query(async ({ ctx }) => {
    const addresses = await ctx.db.customerAddress.findMany({
      where: { userId: ctx.session.user.id },
      select: customerAddressSelect,
    });

    return {
      mailing: addresses.find((address) => address.kind === 'MAILING') ?? null,
      invoice: addresses.find((address) => address.kind === 'INVOICE') ?? null,
    };
  }),

  /** Creates the address of that kind, or replaces it. */
  save: userProcedure.input(addressSaveSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { kind, address } = input;

    return ctx.db.customerAddress.upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind, ...address },
      update: address,
      select: customerAddressSelect,
    });
  }),

  /** Removing an address that is not there is not an error: the outcome is the same. */
  remove: userProcedure.input(addressRemoveSchema).mutation(async ({ ctx, input }) => {
    await ctx.db.customerAddress.deleteMany({ where: { userId: ctx.session.user.id, kind: input.kind } });
  }),
});
