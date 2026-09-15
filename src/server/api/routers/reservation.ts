import { addUtcDays, todayUtc, toUtcDate, utcDaysBetween } from '~/lib/date';
import { toMoneyString } from '~/lib/money';
import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import { quoteReservation } from '~/lib/pricing';
import {
  canCancelAsStore,
  canCancelAsUser,
  canPickUp,
  canReturn,
  DATE_HOLDING_STATUSES,
} from '~/lib/reservation-lifecycle';
import {
  frontDeskSchema,
  myReservationsSchema,
  reservationCreateSchema,
  reservationIdSchema,
  reservationsBySkiSchema,
  reservationsByUserSchema,
} from '~/lib/reservation-schema';
import { isStaff } from '~/lib/roles';
import { badRequest, conflict, isOverlapViolation, notFound } from '~/server/api/errors';
import { overlappingItem } from '~/server/api/overlap';
import { createTRPCRouter, protectedProcedure, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';

// Reservations are never deleted: cancelled and returned ones stay for the history (FR-60). Every
// status change goes through `~/lib/reservation-lifecycle` and is written as a conditional update on
// the expected status, so two people acting on one reservation at once cannot both succeed.

const NOT_FOUND = 'Reservation not found.';
const CHANGED_MEANWHILE = 'This reservation was changed in the meantime. Reload and try again.';
const ALREADY_BOOKED = 'Some of these skis are already booked for some of those days. Pick other dates or other skis.';

const reservationFields = {
  id: true,
  startDate: true,
  endDate: true,
  status: true,
  rentalDays: true,
  discountPercent: true,
  totalPrice: true,
  createdAt: true,
  pickedUpAt: true,
  returnedAt: true,
  cancelledAt: true,
} satisfies Prisma.ReservationSelect;

const skiModelSummary = { select: { id: true, name: true, brand: { select: { name: true } } } } as const;

const rentalRatingSelect = { select: { score: true, note: true, createdAt: true } } as const;

/** Items in a stable order: by model, then length, so the same reservation always reads the same. */
const ITEM_ORDER = [
  { ski: { model: { name: 'asc' } } },
  { ski: { lengthCm: 'asc' } },
  { id: 'asc' },
] satisfies Prisma.ReservationItemOrderByWithRelationInput[];

/** A customer's own reservation: never the inventory codes (FR-40, BR-50). */
const customerReservationSelect = {
  ...reservationFields,
  store: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      pricePerDay: true,
      totalPrice: true,
      ski: { select: { id: true, lengthCm: true, model: skiModelSummary } },
    },
    orderBy: ITEM_ORDER,
  },
  rating: rentalRatingSelect,
} satisfies Prisma.ReservationSelect;

const staffReservationSelect = {
  ...reservationFields,
  store: { select: { id: true, name: true, city: true } },
  items: {
    select: {
      id: true,
      pricePerDay: true,
      totalPrice: true,
      ski: { select: { id: true, inventoryCode: true, lengthCm: true, deletedAt: true, model: skiModelSummary } },
    },
    orderBy: ITEM_ORDER,
  },
  user: { select: { id: true, name: true, email: true, deletedAt: true } },
  pickedUpBy: { select: { id: true, name: true } },
  returnedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  rating: rentalRatingSelect,
} satisfies Prisma.ReservationSelect;

type Priced = { toString(): string };
type PricedItem = { pricePerDay: Priced; totalPrice: Priced };
type PlainItem<I extends PricedItem> = Omit<I, 'pricePerDay' | 'totalPrice'> & {
  pricePerDay: string;
  totalPrice: string;
};

/** Decimal columns leave the API as plain strings. */
function withPlainPrices<T extends { totalPrice: Priced; items: PricedItem[] }>(
  row: T,
): Omit<T, 'totalPrice' | 'items'> & { totalPrice: string; items: PlainItem<T['items'][number]>[] } {
  return {
    ...row,
    totalPrice: toMoneyString(row.totalPrice),
    items: row.items.map((item: T['items'][number]): PlainItem<T['items'][number]> => ({
      ...item,
      pricePerDay: toMoneyString(item.pricePerDay),
      totalPrice: toMoneyString(item.totalPrice),
    })),
  };
}

/** Newest first, tie-broken by id so a page boundary cannot repeat or skip a row. */
const HISTORY_ORDER = [{ startDate: 'desc' }, { id: 'asc' }] satisfies Prisma.ReservationOrderByWithRelationInput[];

/** An overshooting page number is served the last page; `page` says which one came back. */
async function pageOf(db: PrismaClient, where: Prisma.ReservationWhereInput, requested: number) {
  const total = await db.reservation.count({ where });
  const page = Math.min(requested, pageCount(total));
  return { total, page, skip: skipForPage(page), take: PAGE_SIZE };
}

async function findForTransition(db: PrismaClient, id: string) {
  const reservation = await db.reservation.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, startDate: true, endDate: true },
  });

  if (!reservation) throw notFound(NOT_FOUND);

  return reservation;
}

export const reservationRouter = createTRPCRouter({
  /**
   * Book one or more skis from one store for the same days (FR-33, BR-6). The database constraint is
   * what prevents double booking (BR-20); the query before the insert only exists to answer the
   * ordinary case with a readable message. Prices are quoted from the models' current prices and saved
   * on the items (BR-5).
   */
  create: userProcedure.input(reservationCreateSchema).mutation(async ({ ctx, input }) => {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);

    const skis = await ctx.db.ski.findMany({
      where: { id: { in: input.skiIds }, deletedAt: null },
      select: { id: true, storeId: true, isAvailable: true, model: { select: { pricePerDay: true } } },
    });

    if (skis.length !== input.skiIds.length) throw notFound('Some of these skis are no longer in the fleet.');
    if (skis.some((ski) => !ski.isAvailable)) {
      throw conflict('Some of these skis are not offered for rental at the moment. Remove them and try again.');
    }

    const storeIds = new Set(skis.map((ski) => ski.storeId));
    const [storeId] = storeIds;
    if (storeIds.size !== 1 || !storeId) throw badRequest('All skis in a reservation must be from the same store.');

    const clash = await ctx.db.reservationItem.findFirst({
      where: { skiId: { in: input.skiIds }, ...overlappingItem(startDate, endDate) },
      select: { id: true },
    });

    if (clash) throw conflict(ALREADY_BOOKED);

    const quote = quoteReservation(
      skis.map((ski) => ({ skiId: ski.id, pricePerDay: toMoneyString(ski.model.pricePerDay) })),
      utcDaysBetween(startDate, endDate),
    );

    try {
      const reservation = await ctx.db.reservation.create({
        data: {
          userId: ctx.session.user.id,
          storeId,
          startDate,
          endDate,
          rentalDays: quote.rentalDays,
          discountPercent: quote.discountPercent,
          totalPrice: quote.totalPrice,
          items: {
            create: quote.items.map((item) => ({
              skiId: item.skiId,
              startDate,
              endDate,
              pricePerDay: item.quote.pricePerDay,
              totalPrice: item.quote.totalPrice,
            })),
          },
        },
        select: customerReservationSelect,
      });

      return withPlainPrices(reservation);
    } catch (error) {
      // Only reachable when another booking committed between the check and the insert.
      if (isOverlapViolation(error)) throw conflict(ALREADY_BOOKED);
      throw error;
    }
  }),

  /**
   * A customer cancels their own booking before its first day; staff cancel any booking not yet
   * picked up, which is also how a no-show is recorded (BR-11).
   */
  cancel: protectedProcedure.input(reservationIdSchema).mutation(async ({ ctx, input }) => {
    const user = ctx.session.user;
    const byStore = isStaff(user.role);
    const reservation = await findForTransition(ctx.db, input.id);

    // Not found rather than forbidden, so a customer cannot probe other people's reservation ids.
    if (!byStore && reservation.userId !== user.id) throw notFound(NOT_FOUND);

    if (byStore ? !canCancelAsStore(reservation) : !canCancelAsUser(reservation, todayUtc())) {
      throw conflict(
        reservation.status !== 'CREATED'
          ? 'Only a booking that has not been picked up can be cancelled.'
          : 'This rental has already started, so it can no longer be cancelled online. Please contact the store.',
      );
    }

    const { count } = await ctx.db.reservation.updateMany({
      where: { id: reservation.id, status: 'CREATED' },
      data: {
        status: byStore ? 'CANCELLED_BY_STORE' : 'CANCELLED_BY_USER',
        cancelledAt: new Date(),
        cancelledById: user.id,
      },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }),

  /** Staff hand the skis over, on a day within the rental period (BR-11). */
  pickUp: staffProcedure.input(reservationIdSchema).mutation(async ({ ctx, input }) => {
    const reservation = await findForTransition(ctx.db, input.id);
    const today = todayUtc();

    if (!canPickUp(reservation, today)) {
      if (reservation.status !== 'CREATED') throw conflict('This reservation is not waiting for pickup.');
      if (reservation.startDate > today) throw badRequest('Skis can be picked up from the first day of the rental.');
      throw badRequest('The rental period is over. Cancel the booking as a no-show instead.');
    }

    const { count } = await ctx.db.reservation.updateMany({
      where: { id: reservation.id, status: 'CREATED' },
      data: { status: 'ACTIVE', pickedUpAt: new Date(), pickedUpById: ctx.session.user.id },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }),

  /**
   * Staff take the skis back, on any day. An early return keeps the agreed price and frees the rest of
   * the booked days, because returned reservations hold no dates (BR-15).
   */
  markReturned: staffProcedure.input(reservationIdSchema).mutation(async ({ ctx, input }) => {
    const reservation = await findForTransition(ctx.db, input.id);

    if (!canReturn(reservation)) throw conflict('Only skis that have been picked up can be returned.');

    const { count } = await ctx.db.reservation.updateMany({
      where: { id: reservation.id, status: 'ACTIVE' },
      data: { status: 'RETURNED', returnedAt: new Date(), returnedById: ctx.session.user.id },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }),

  /**
   * The caller's own reservations, newest first (FR-40). Each carries the customer's ratings of the ski
   * models in it, so the screen can tell whether this reservation may create, edit or reopen each one.
   */
  listMine: userProcedure.input(myReservationsSchema).query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const where = { userId };
    const { total, page, skip, take } = await pageOf(ctx.db, where, input.page);
    const rows = await ctx.db.reservation.findMany({
      where,
      select: customerReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    const modelIds = [...new Set(rows.flatMap((row) => row.items.map((item) => item.ski.model.id)))];
    const modelRatings = await ctx.db.modelRating.findMany({
      where: { userId, modelId: { in: modelIds } },
      select: { modelId: true, score: true, comment: true, reservationId: true, windowStartedAt: true },
    });

    const items = rows.map((row) => {
      const models = new Set(row.items.map((item) => item.ski.model.id));
      return { ...withPlainPrices(row), modelRatings: modelRatings.filter((rating) => models.has(rating.modelId)) };
    });

    return { items, total, page };
  }),

  /** Every reservation of one ski, for its detail page (FR-60). */
  bySki: staffProcedure.input(reservationsBySkiSchema).query(async ({ ctx, input }) => {
    const where = { items: { some: { skiId: input.skiId } } } satisfies Prisma.ReservationWhereInput;
    const { total, page, skip, take } = await pageOf(ctx.db, where, input.page);
    const rows = await ctx.db.reservation.findMany({
      where,
      select: staffReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    return { items: rows.map(withPlainPrices), total, page };
  }),

  /** Every reservation of one customer, for their account page (FR-60). */
  byUser: staffProcedure.input(reservationsByUserSchema).query(async ({ ctx, input }) => {
    const where = { userId: input.userId };
    const { total, page, skip, take } = await pageOf(ctx.db, where, input.page);
    const rows = await ctx.db.reservation.findMany({
      where,
      select: staffReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    return { items: rows.map(withPlainPrices), total, page };
  }),

  /**
   * The front desk of one store (FR-50). The conditions are the SQL form of the due and overdue checks
   * in `~/lib/reservation-lifecycle`.
   */
  frontDesk: staffProcedure.input(frontDeskSchema).query(async ({ ctx, input }) => {
    const today = todayUtc();
    const atStore = { storeId: input.storeId } satisfies Prisma.ReservationWhereInput;
    const list = (where: Prisma.ReservationWhereInput, orderBy: Prisma.ReservationOrderByWithRelationInput[]) =>
      ctx.db.reservation.findMany({ where: { ...atStore, ...where }, select: staffReservationSelect, orderBy });

    const [pickupsDueToday, overduePickups, returnsDueToday, overdueReturns] = await ctx.db.$transaction([
      list({ status: 'CREATED', startDate: today }, [{ createdAt: 'asc' }]),
      list({ status: 'CREATED', startDate: { lt: today } }, [{ startDate: 'asc' }, { id: 'asc' }]),
      list({ status: 'ACTIVE', endDate: addUtcDays(today, 1) }, [{ pickedUpAt: 'asc' }]),
      list({ status: 'ACTIVE', endDate: { lte: today } }, [{ endDate: 'asc' }, { id: 'asc' }]),
    ]);

    return {
      pickupsDueToday: pickupsDueToday.map(withPlainPrices),
      overduePickups: overduePickups.map(withPlainPrices),
      returnsDueToday: returnsDueToday.map(withPlainPrices),
      overdueReturns: overdueReturns.map(withPlainPrices),
    };
  }),

  /**
   * What stands in the way of changing a ski, counted over its whole history rather than the page on
   * screen: `upcoming` bookings are honoured when it goes out of rental (BR-22), `upcoming` and `active`
   * block a move (BR-30), and `open` blocks deletion (BR-31).
   */
  blockersBySki: staffProcedure.input(reservationsBySkiSchema.pick({ skiId: true })).query(async ({ ctx, input }) => {
    const today = todayUtc();

    const holding = (where: Prisma.ReservationWhereInput) =>
      ctx.db.reservation.count({ where: { items: { some: { skiId: input.skiId } }, ...where } });

    const [upcoming, active, open] = await ctx.db.$transaction([
      holding({ status: 'CREATED', endDate: { gt: today } }),
      holding({ status: 'ACTIVE' }),
      holding({ status: { in: [...DATE_HOLDING_STATUSES] } }),
    ]);

    return { upcoming, active, open };
  }),
});
