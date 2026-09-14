import { authRouter } from '~/server/api/routers/auth';
import { brandRouter } from '~/server/api/routers/brand';
import { healthRouter } from '~/server/api/routers/health';
import { skiModelRouter } from '~/server/api/routers/ski-model';
import { storeRouter } from '~/server/api/routers/store';
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';

/** Every router in `api/routers` is registered here, in alphabetical order. */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  brand: brandRouter,
  health: healthRouter,
  skiModel: skiModelRouter,
  store: storeRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
