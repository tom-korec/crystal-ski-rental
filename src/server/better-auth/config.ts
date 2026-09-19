import { after } from 'next/server';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';

import { env } from '~/env';
import { appUrl, trustedOrigins } from '~/lib/app-url';
import { db } from '~/server/db';
import { sendPasswordResetEmail } from '~/server/email/password-reset';

// Identical to Better Auth's own wrong-password message, so a deleted account is indistinguishable from it.
export const INVALID_CREDENTIALS = 'Invalid email or password';

export const auth = betterAuth({
  baseURL: appUrl(env),
  trustedOrigins: trustedOrigins(env),
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    // Sent after the response: the answer must not wait for the mail server, and it says the same
    // thing whether or not the address has an account.
    sendResetPassword: ({ user, url }) => {
      after(() => sendPasswordResetEmail({ to: user.email, name: user.name, url }));

      return Promise.resolve();
    },
  },
  // Every sign-in and sign-up goes through the tRPC auth router, which rate-limits them. Better Auth's own
  // HTTP endpoints for the same actions would bypass that, so they are closed; server-side calls still work.
  disabledPaths: ['/sign-in/email', '/sign-up/email'],
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
