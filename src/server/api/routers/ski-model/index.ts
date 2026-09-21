import { createTRPCRouter } from '~/server/api/trpc';
import { create } from './create';
import { remove } from './delete';
import { list } from './list';
import { update } from './update';

export const skiModelRouter = createTRPCRouter({
  create,
  // `delete` is a reserved word, so the file exports it as `remove` and the endpoint keeps its name.
  delete: remove,
  list,
  update,
});
