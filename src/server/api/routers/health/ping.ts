import { publicProcedure } from '~/server/api/trpc';

/** Answers without touching the database, so it says the app is up, not that Postgres is. */
export const ping = publicProcedure.query(() => ({ status: 'ok' as const }));
