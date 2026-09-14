import { TRPCError } from '@trpc/server';
import { APIError } from 'better-auth/api';

import { signInSchema, signUpSchema } from '~/lib/auth-schema';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { auth } from '~/server/better-auth';

// Sign-in and sign-up go through tRPC so the forms share one typed API and one set of Zod schemas.
// Better Auth sets the session cookie on its own response, so it is copied onto the tRPC response.

function forwardCookies(from: Headers, to: Headers | undefined): void {
  if (!to) return;

  // `getSetCookie` keeps each cookie separate; reading the header as one string would join them with
  // commas and corrupt any cookie that carries an Expires date.
  for (const cookie of from.getSetCookie()) {
    to.append('set-cookie', cookie);
  }
}

function toTRPCError(error: unknown): TRPCError {
  if (!(error instanceof APIError)) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }

  const code =
    error.statusCode === 401 || error.statusCode === 403
      ? 'UNAUTHORIZED'
      : error.statusCode === 400 || error.statusCode === 422
        ? 'BAD_REQUEST'
        : error.statusCode === 429
          ? 'TOO_MANY_REQUESTS'
          : 'INTERNAL_SERVER_ERROR';

  return new TRPCError({ code, message: error.body?.message, cause: error });
}

export const authRouter = createTRPCRouter({
  /** The signed-in account, or null. Never the session token. */
  session: publicProcedure.query(({ ctx }) => {
    const user = ctx.session?.user;

    if (!user || user.deletedAt) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }),

  /** Every sign-up is a customer: `role` is not accepted as input (FR-1). */
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    try {
      const { headers, response } = await auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, ctx.resHeaders);

      return { id: response.user.id, role: response.user.role };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    try {
      const { headers, response } = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, ctx.resHeaders);

      return { id: response.user.id, role: response.user.role };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  signOut: publicProcedure.mutation(async ({ ctx }) => {
    try {
      const { headers } = await auth.api.signOut({ headers: ctx.headers, returnHeaders: true });

      forwardCookies(headers, ctx.resHeaders);

      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),
});
