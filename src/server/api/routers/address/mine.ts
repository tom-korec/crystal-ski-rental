import { userProcedure } from '~/server/api/trpc';

/** The caller's own mailing and invoice addresses (FR-6). */
export const mine = userProcedure.query(({ ctx }) => ctx.services.addresses.mine(ctx.session.user.id));
