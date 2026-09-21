import { createTRPCRouter } from '~/server/api/trpc';
import { ping } from './ping';

export const healthRouter = createTRPCRouter({ ping });
