import { authRouter } from '~/server/api/routers/auth';
import { healthRouter } from '~/server/api/routers/health';
import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';

/** Every router in `api/routers` is registered here, in alphabetical order. */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
