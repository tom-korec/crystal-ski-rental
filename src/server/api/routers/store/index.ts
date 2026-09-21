import { createTRPCRouter } from '~/server/api/trpc';
import { byId } from './by-id';
import { create } from './create';
import { remove } from './delete';
import { list } from './list';
import { removeSpecialDay } from './remove-special-day';
import { setSpecialDay } from './set-special-day';
import { update } from './update';

export const storeRouter = createTRPCRouter({
  byId,
  create,
  // `delete` is a reserved word, so the file exports it as `remove` and the endpoint keeps its name.
  delete: remove,
  list,
  removeSpecialDay,
  setSpecialDay,
  update,
});
