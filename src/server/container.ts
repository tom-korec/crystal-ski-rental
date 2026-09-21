import 'server-only';

import { asClass, asValue, type AwilixContainer, createContainer, InjectionMode } from 'awilix';

import { db } from '~/server/db';
import { SystemClock } from '~/server/services/clock';
import { Mailer } from '~/server/services/mailer';
import { RateLimiter } from '~/server/services/rate-limiter';
import type { Services } from '~/server/services/types';

/**
 * Dependencies are wired here and nowhere else: a service names what it needs in its constructor and
 * is never responsible for building it.
 *
 * `PROXY` mode passes the whole cradle as one object. The alternative, `CLASSIC`, recovers the names
 * from the constructor signature, which a minified production bundle no longer has. Registrations are
 * written out for the same reason: Awilix can glob the filesystem for modules, but nothing survives
 * bundling that way.
 */
function buildContainer(): AwilixContainer<Services> {
  const container = createContainer<Services>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    // The Prisma client is already a process-wide singleton that survives hot reloads.
    db: asValue(db),
    clock: asClass(SystemClock).singleton(),
    mailer: asClass(Mailer).singleton(),
    rateLimiter: asClass(RateLimiter).singleton(),
  });

  return container;
}

const container = buildContainer();

/** One scope per request: services that hold anything request-shaped are registered `scoped()`. */
export function createRequestScope(): AwilixContainer<Services> {
  return container.createScope();
}
