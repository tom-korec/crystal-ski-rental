import { addUtcDays, todayUtc, toUtcDate, utcDaysBetween } from '~/lib/date';
import { toMoneyString } from '~/lib/money';
import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import { quoteRental } from '~/lib/pricing';
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
import { overlappingReservation } from '~/server/api/overlap';
import { storeSelect } from '~/server/api/selects';
import { createTRPCRouter, protectedProcedure, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';

// Reservations are never deleted: cancelled and returned ones stay for the history (FR-60). Every
// status change goes through `~/lib/reservation-lifecycle` and is written as a conditional update on
// the expected status, so two people acting on one reservation at once cannot both succeed.

const NOT_FOUND = 'Reservation not found.';
const CHANGED_MEANWHILE = 'This reservation was changed in the meantime. Reload and try again.';
const ALREADY_BOOKED = 'These skis are already booked for some of those days. Pick other dates or other skis.';

const reservationFields = {
  id: true,
  startDate: true,
  endDate: true,
  status: true,
  pricePerDay: true,
  rentalDays: true,
  discountPercent: true,
  totalPrice: true,
  createdAt: true,
  pickedUpAt: true,
  returnedAt: true,
  cancelledAt: true,
} satisfies Prisma.ReservationSelect;

const skiModelSummary = { select: { id: true, name: true, brand: { select: { name: true } } } } as const;

/** A customer's own reservation: the store's full details, never the inventory code (FR-40, BR-50). */
const customerReservationSelect = {
  ...reservationFields,
  ski: { select: { id: true, lengthCm: true, model: skiModelSummary, store: { select: storeSelect } } },
} satisfies Prisma.ReservationSelect;

const staffReservationSelect = {
  ...reservationFields,
  ski: {
    select: {
      id: true,
      inventoryCode: true,
      lengthCm: true,
      deletedAt: true,
      model: skiModelSummary,
      store: { select: { id: true, name: true, city: true } },
    },
  },
  user: { select: { id: true, name: true, email: true, deletedAt: true } },
  pickedUpBy: { select: { id: true, name: true } },
  returnedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
} satisfies Prisma.ReservationSelect;

function withPlainPrices<T extends { pricePerDay: { toString(): string }; totalPrice: { toString(): string } }>(
  row: T,
) {
  return { ...row, pricePerDay: toMoneyString(row.pricePerDay), totalPrice: toMoneyString(row.totalPrice) };
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
   * Book a ski (FR-33). The database constraint is what prevents double booking (BR-20); the query
   * before the insert only exists to answer the ordinary case with a readable message. The price is
   * quoted from the model's current price and saved on the reservation (BR-5).
   */
  create: userProcedure.input(reservationCreateSchema).mutation(async ({ ctx, input }) => {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);

    const ski = await ctx.db.ski.findFirst({
      where: { id: input.skiId, deletedAt: null },
      select: { id: true, isAvailable: true, model: { select: { pricePerDay: true } } },
    });

    if (!ski) throw notFound('Ski not found.');
    if (!ski.isAvailable) throw conflict('These skis are not offered for rental at the moment.');

    const clash = await ctx.db.reservation.findFirst({
      where: { skiId: ski.id, ...overlappingReservation(startDate, endDate) },
      select: { id: true },
    });

    if (clash) throw conflict(ALREADY_BOOKED);

    const quote = quoteRental(toMoneyString(ski.model.pricePerDay), utcDaysBetween(startDate, endDate));

    try {
      const reservation = await ctx.db.reservation.create({
        data: {
          skiId: ski.id,
          userId: ctx.session.user.id,
          startDate,
          endDate,
          pricePerDay: quote.pricePerDay,
          rentalDays: quote.rentalDays,
          discountPercent: quote.discountPercent,
          totalPrice: quote.totalPrice,
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

  /** The caller's own reservations, newest first (FR-40). */
  listMine: userProcedure.input(myReservationsSchema).query(async ({ ctx, input }) => {
    const where = { userId: ctx.session.user.id };
    const { total, page, skip, take } = await pageOf(ctx.db, where, input.page);
    const rows = await ctx.db.reservation.findMany({
      where,
      select: customerReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    return { items: rows.map(withPlainPrices), total, page };
  }),

  /** Every reservation of one ski, for its detail page (FR-60). */
  bySki: staffProcedure.input(reservationsBySkiSchema).query(async ({ ctx, input }) => {
    const where = { skiId: input.skiId };
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
    const atStore = { ski: { storeId: input.storeId } } satisfies Prisma.ReservationWhereInput;
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

    const [upcoming, active, open] = await ctx.db.$transaction([
      ctx.db.reservation.count({ where: { skiId: input.skiId, status: 'CREATED', endDate: { gt: today } } }),
      ctx.db.reservation.count({ where: { skiId: input.skiId, status: 'ACTIVE' } }),
      ctx.db.reservation.count({ where: { skiId: input.skiId, status: { in: [...DATE_HOLDING_STATUSES] } } }),
    ]);

    return { upcoming, active, open };
  }),
});
