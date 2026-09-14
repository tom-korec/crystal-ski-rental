import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import type { NextRequest } from 'next/server';

import { env } from '~/env';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: ({ resHeaders }) => createTRPCContext({ headers: req.headers, resHeaders }),
    onError: ({ path, error }) => {
      // In production the client only sees a generic message for a 500, so this log is the one
      // remaining record of what actually failed.
      if (env.NODE_ENV !== 'development' && error.code !== 'INTERNAL_SERVER_ERROR') return;

      console.error(`tRPC failed on ${path ?? '<no-path>'}:`, error);
    },
  });

export { handler as GET, handler as POST };
