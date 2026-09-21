import { after } from 'next/server';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';

import { env } from '~/env';
import { appUrl, trustedOrigins } from '~/lib/app-url';
import { db } from '~/server/db';
import { sendPasswordResetEmail } from '~/server/email/password-reset';
import { isEmailConfigured } from '~/server/email/send';
import { sendVerificationEmail } from '~/server/email/verify-email';

// Identical to Better Auth's own wrong-password message, so a deleted account is indistinguishable from it.
export const INVALID_CREDENTIALS = 'Invalid email or password';

export const auth = betterAuth({
  baseURL: appUrl(env),
  trustedOrigins: trustedOrigins(env),
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    // Without a mail server nobody could ever confirm, so the requirement follows the configuration
    // rather than locking every new account out (FR-9).
    requireEmailVerification: isEmailConfigured(),
    resetPasswordTokenExpiresIn: 60 * 60,
    // Sent after the response: the answer must not wait for the mail server, and it says the same
    // thing whether or not the address has an account.
    sendResetPassword: ({ user, url }) => {
      after(() => sendPasswordResetEmail({ to: user.email, name: user.name, url }));

      return Promise.resolve();
    },
  },
  emailVerification: {
    expiresIn: 60 * 60,
    // A new link is asked for explicitly, through the rate-limited tRPC procedure: a link on every
    // refused sign-in would turn the form into a way of mailing someone else repeatedly.
    sendOnSignIn: false,
    // Confirming proves the address, not that the person is at their keyboard: they sign in after it.
    autoSignInAfterVerification: false,
    sendVerificationEmail: ({ user, url }) => {
      after(() => sendVerificationEmail({ to: user.email, name: user.name, url }));

      return Promise.resolve();
    },
  },
  // Every sign-in and sign-up goes through the tRPC auth router, which rate-limits them. Better Auth's own
  // HTTP endpoints for the same actions would bypass that, so they are closed; server-side calls still work.
  disabledPaths: ['/sign-in/email', '/sign-up/email', '/send-verification-email'],
  user: {
    additionalFields: {
      // `input: false` is the security control: without it a sign-up request could send
      // `"role": "ADMIN"` and grant itself the staff area (NFR-5).
      role: { type: 'string', required: false, input: false },
      deletedAt: { type: 'date', required: false, input: false },
      storeId: { type: 'string', required: false, input: false },
      termsAcceptedVersion: { type: 'string', required: false, input: false },
      privacyAcceptedVersion: { type: 'string', required: false, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Runs for every way of signing in, including Better Auth's own REST endpoints, so a
        // deleted account cannot get a session. Same message as a wrong password, so it reveals
        // nothing about the address (BR-33).
        before: async (session) => {
          const user = await db.user.findUnique({
            where: { id: session.userId },
            select: { deletedAt: true },
          });

          if (!user || user.deletedAt) {
            throw new APIError('UNAUTHORIZED', { message: INVALID_CREDENTIALS });
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
