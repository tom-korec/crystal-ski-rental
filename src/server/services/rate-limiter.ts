import { isRateLimited, type RateLimitRule, recordAttempt } from '~/server/api/rate-limit';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

/** The Postgres-backed limits of `~/server/api/rate-limit`, as an injectable dependency. */
export class RateLimiter {
  private readonly db: PrismaClient;

  constructor({ db }: Services) {
    this.db = db;
  }

  isLimited(key: string, rule: RateLimitRule): Promise<boolean> {
    return isRateLimited(this.db, key, rule);
  }

  record(key: string, rule: RateLimitRule): Promise<void> {
    return recordAttempt(this.db, key, rule);
  }
}
