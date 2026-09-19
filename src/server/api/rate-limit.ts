import type { PrismaClient } from '../../../generated/prisma/client';

export interface RateLimitRule {
  max: number;
  windowMs: number;
}

// Per client IP and per e-mail address. Only failed sign-ins count, so someone who knows their password is
// never slowed down; every sign-up counts.
export const RATE_LIMITS = {
  signInPerClient: { max: 20, windowMs: 10 * 60_000 },
  signInPerAccount: { max: 5, windowMs: 10 * 60_000 },
  signUpPerClient: { max: 5, windowMs: 60 * 60_000 },
  passwordResetPerClient: { max: 5, windowMs: 60 * 60_000 },
  passwordResetPerAccount: { max: 3, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/** The client as the platform reports it. Vercel puts the real address first in `x-forwarded-for`. */
export function clientKey(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? 'unknown';
}

export async function isRateLimited(db: PrismaClient, key: string, rule: RateLimitRule): Promise<boolean> {
  const entry = await db.rateLimit.findUnique({ where: { key } });

  if (!entry || entry.windowStartedAt.getTime() + rule.windowMs < Date.now()) return false;

  return entry.count >= rule.max;
}

/** Counts one attempt, starting a new window when the previous one has passed. A single statement, so concurrent attempts all count. */
export async function recordAttempt(db: PrismaClient, key: string, rule: RateLimitRule): Promise<void> {
  const windowStart = new Date(Date.now() - rule.windowMs);

  await db.$executeRaw`
    INSERT INTO rate_limit (key, count, "windowStartedAt")
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit."windowStartedAt" < ${windowStart} THEN 1 ELSE rate_limit.count + 1 END,
      "windowStartedAt" = CASE WHEN rate_limit."windowStartedAt" < ${windowStart} THEN now() ELSE rate_limit."windowStartedAt" END`;
}
