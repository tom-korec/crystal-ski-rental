import { createTRPCRouter } from '~/server/api/trpc';
import { mine } from './mine';
import { remove } from './remove';
import { save } from './save';

export const addressRouter = createTRPCRouter({ mine, remove, save });
