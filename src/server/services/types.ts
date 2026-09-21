import type { Clock } from './clock';
import type { Mailer } from './mailer';
import type { ReservationService } from './reservation-service';
import type { SkiService } from './ski-service';
import type { RateLimiter } from './rate-limiter';
import type { RatingService } from './rating-service';

import type { PrismaClient } from '../../../generated/prisma/client';

/**
 * Everything the container can resolve, and the shape a service's constructor receives. Awilix
 * resolves by property name, so this interface is the single list of what those names are.
 */
export interface Services {
  db: PrismaClient;
  clock: Clock;
  mailer: Mailer;
  rateLimiter: RateLimiter;
  ratings: RatingService;
  reservations: ReservationService;
  skis: SkiService;
}
