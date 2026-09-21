import { createTRPCRouter } from '~/server/api/trpc';
import { byModel } from './by-model';
import { rate } from './rate';

export const ratingRouter = createTRPCRouter({ byModel, rate });
