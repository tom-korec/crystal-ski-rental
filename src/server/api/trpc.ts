import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError, z } from 'zod';

import { env } from '~/env';
import { hasAcceptedCurrentTerms } from '~/lib/legal';
import { isAdmin, isCustomer, isStaff } from '~/lib/roles';
import { clientErrorMessage } from '~/server/api/errors';
import { auth } from '~/server/better-auth';
import { createRequestScope } from '~/server/container';

/** @see https://trpc.io/docs/server/context */
export const createTRPCContext = async (opts: {
  headers: Headers;
  /** Absent for calls from a server component, where there is no response to set cookies on. */
  resHeaders?: Headers;
}) => {
  const session = await auth.api.getSession({ headers: opts.headers });

  // A procedure reaches data only through a service: the database is not on the context.
  return { services: createRequestScope().cradle, session, ...opts };
};

const isProduction = env.NODE_ENV === 'production';

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  // Pinned rather than inferred from the runtime environment, so a production build never attaches
  // stack traces to error responses.
  isDev: !isProduction,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: clientErrorMessage(error.code, shape.message, isProduction),
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? z.flattenError(error.cause) : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

/** Development only: logs how long each procedure took. */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms to execute`);
  return result;
});

const baseProcedure = isProduction ? t.procedure : t.procedure.use(timingMiddleware);

/** Unauthenticated. `ctx.session` may still be set. */
export const publicProcedure = baseProcedure;

/** Any signed-in account. Guarantees `ctx.session.user`. */
export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  const session = ctx.session;

  if (!session?.user || session.user.deletedAt) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({ ctx: { session: { ...session, user: session.user } } });
});

/** Customers only. Staff do not rent; a staff member who wants to rent uses a customer account. */
export const userProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isCustomer(ctx.session.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only customer accounts can rent and rate skis.' });
  }
  if (!hasAcceptedCurrentTerms(ctx.session.user)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Accept the current terms and privacy policy first.' });
  }

  return next();
});

/** Managers and admins. */
export const staffProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!isStaff(ctx.session.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only staff can do this.' });
  }

  return next();
});

/** Admins only. */
export const adminProcedure = staffProcedure.use(({ ctx, next }) => {
  if (!isAdmin(ctx.session.user.role)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Only an administrator can change this.' });
  }

  return next();
});
