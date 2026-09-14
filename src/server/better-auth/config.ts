import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';

import { env } from '~/env';
import { db } from '~/server/db';

// Identical to Better Auth's own wrong-password message, so a deleted account is indistinguishable from it.
export const INVALID_CREDENTIALS = 'Invalid email or password';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // `input: false` is the security control: without it a sign-up request could send
      // `"role": "ADMIN"` and grant itself the staff area (NFR-5).
      role: { type: 'string', required: false, input: false },
      deletedAt: { type: 'date', required: false, input: false },
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
