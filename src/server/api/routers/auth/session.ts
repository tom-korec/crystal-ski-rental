import { publicProcedure } from '~/server/api/trpc';

/** The signed-in account, or null. Never the session token. */
export const session = publicProcedure.query(({ ctx }) => {
  const user = ctx.session?.user;

  if (!user || user.deletedAt) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});
