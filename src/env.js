import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(32),
    // Optional: on Vercel the URL is worked out from the variables below (see src/lib/app-url.ts).
    BETTER_AUTH_URL: z.url().optional(),
    DATABASE_URL: z.url(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Set by Vercel on every deployment.
    VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
    VERCEL_URL: z.string().optional(),
    VERCEL_BRANCH_URL: z.string().optional(),
    VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  },

  client: {
    // Public demo: shows the demo accounts on the landing page and a notice that data resets daily.
    NEXT_PUBLIC_DEMO_MODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  },

  // Destructured by hand: edge runtimes and the client cannot enumerate `process.env`.
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  },

  // For builds without real secrets, e.g. a Docker image build.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
