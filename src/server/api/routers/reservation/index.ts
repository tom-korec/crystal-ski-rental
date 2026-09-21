import { createTRPCRouter } from '~/server/api/trpc';
import { blockersBySki } from './blockers-by-ski';
import { byCode } from './by-code';
import { byId } from './by-id';
import { bySki } from './by-ski';
import { byUser } from './by-user';
import { cancel } from './cancel';
import { create } from './create';
import { frontDesk } from './front-desk';
import { listMine } from './list-mine';
import { markReturned } from './mark-returned';
import { pickUp } from './pick-up';
import { quote } from './quote';
import { search } from './search';

export const reservationRouter = createTRPCRouter({
  blockersBySki,
  byCode,
  byId,
  bySki,
  byUser,
  cancel,
  create,
  frontDesk,
  listMine,
  markReturned,
  pickUp,
  quote,
  search,
});
