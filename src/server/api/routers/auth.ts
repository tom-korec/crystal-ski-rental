import { TRPCError } from '@trpc/server';
import { APIError } from 'better-auth/api';

import { passwordResetRequestSchema, passwordResetSchema, signInSchema, signUpSchema } from '~/lib/auth-schema';
import { LEGAL_VERSIONS } from '~/lib/legal';
import { RESET_PASSWORD } from '~/lib/routes';
import { passwordChangeSchema, profileUpdateSchema } from '~/lib/profile-schema';
import { clientKey, isRateLimited, RATE_LIMITS, recordAttempt } from '~/server/api/rate-limit';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '~/server/api/trpc';
import { auth } from '~/server/better-auth';
import { isEmailConfigured } from '~/server/email/send';

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

const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
const EMAIL_UNAVAILABLE = 'Password reset is unavailable right now. Please ask us to set a new password.';

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
    const clientLimit = `sign-up:client:${clientKey(ctx.headers)}`;

    if (await isRateLimited(ctx.db, clientLimit, RATE_LIMITS.signUpPerClient)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }
    await recordAttempt(ctx.db, clientLimit, RATE_LIMITS.signUpPerClient);

    try {
      const { headers, response } = await auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, ctx.resHeaders);

      // The checkbox said yes; what was accepted is always the current version, whatever the client sent.
      const now = new Date();
      await ctx.db.user.update({
        where: { id: response.user.id },
        data: {
          termsAcceptedVersion: LEGAL_VERSIONS.terms,
          termsAcceptedAt: now,
          privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
          privacyAcceptedAt: now,
        },
      });

      return { id: response.user.id, role: response.user.role };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    const clientLimit = `sign-in:client:${clientKey(ctx.headers)}`;
    const accountLimit = `sign-in:account:${input.email.toLowerCase()}`;

    if (
      (await isRateLimited(ctx.db, clientLimit, RATE_LIMITS.signInPerClient)) ||
      (await isRateLimited(ctx.db, accountLimit, RATE_LIMITS.signInPerAccount))
    ) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }

    try {
      const { headers, response } = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: ctx.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, ctx.resHeaders);

      return { id: response.user.id, role: response.user.role };
    } catch (error) {
      const failure = toTRPCError(error);

      if (failure.code === 'UNAUTHORIZED') {
        await Promise.all([
          recordAttempt(ctx.db, clientLimit, RATE_LIMITS.signInPerClient),
          recordAttempt(ctx.db, accountLimit, RATE_LIMITS.signInPerAccount),
        ]);
      }

      throw failure;
    }
  }),

  /**
   * Asks for a reset link (FR-8). The answer is the same whether or not the address has an account, so
   * it never reveals who is registered; seeded demo accounts get no link at all (they share one public
   * password), which the send policy enforces.
   */
  requestPasswordReset: publicProcedure.input(passwordResetRequestSchema).mutation(async ({ ctx, input }) => {
    const clientLimit = `password-reset:client:${clientKey(ctx.headers)}`;
    const accountLimit = `password-reset:account:${input.email.toLowerCase()}`;

    if (
      (await isRateLimited(ctx.db, clientLimit, RATE_LIMITS.passwordResetPerClient)) ||
      (await isRateLimited(ctx.db, accountLimit, RATE_LIMITS.passwordResetPerAccount))
    ) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }
    await Promise.all([
      recordAttempt(ctx.db, clientLimit, RATE_LIMITS.passwordResetPerClient),
      recordAttempt(ctx.db, accountLimit, RATE_LIMITS.passwordResetPerAccount),
    ]);

    if (!isEmailConfigured()) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: EMAIL_UNAVAILABLE });
    }

    try {
      await auth.api.requestPasswordReset({
        body: { email: input.email, redirectTo: RESET_PASSWORD },
        headers: ctx.headers,
      });
    } catch (error) {
      // An unknown address, a closed mailbox or a slow provider all look the same to the caller.
      console.error('Requesting a password reset failed:', error);
    }

    return { requested: true };
  }),

  /** Sets a new password from the link's one-time token, which Better Auth checks and then spends. */
  resetPassword: publicProcedure.input(passwordResetSchema).mutation(async ({ input }) => {
    try {
      await auth.api.resetPassword({ body: { newPassword: input.password, token: input.token } });

      return { reset: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }),

  /** A customer accepts the current Terms and Privacy policy, e.g. after they changed (FR-7). */
  acceptLegal: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        termsAcceptedVersion: LEGAL_VERSIONS.terms,
        termsAcceptedAt: now,
        privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
        privacyAcceptedAt: now,
      },
    });
  }),

  /** Name only: the e-mail is the sign-in identifier and nothing verifies a new one (FR-4). */
  updateProfile: protectedProcedure.input(profileUpdateSchema).mutation(({ ctx, input }) =>
    ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: { name: input.name },
      select: { id: true, name: true },
    }),
  ),

  /**
   * Better Auth checks the current password, revokes every other session and re-issues this one, so
   * the new cookie has to be forwarded or the caller would be signed out (FR-4).
   */
  changePassword: protectedProcedure.input(passwordChangeSchema).mutation(async ({ ctx, input }) => {
    try {
      const { headers } = await auth.api.changePassword({
        body: { currentPassword: input.currentPassword, newPassword: input.newPassword, revokeOtherSessions: true },
        headers: ctx.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, ctx.resHeaders);

      return { success: true };
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
