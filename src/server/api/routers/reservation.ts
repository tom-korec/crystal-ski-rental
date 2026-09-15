import { addUtcDays, todayUtc, toUtcDate, utcDaysBetween } from '~/lib/date';
import { toMoneyString } from '~/lib/money';
import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import { closedRentalDays, rentalDays } from '~/lib/opening-hours';
import { quoteReservation } from '~/lib/pricing';
import { generateReservationCode } from '~/lib/reservation-code';
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
  reservationByCodeSchema,
  reservationIdSchema,
  reservationQuoteSchema,
  reservationSearchSchema,
  reservationsBySkiSchema,
  reservationsByUserSchema,
} from '~/lib/reservation-schema';
import { isStaff } from '~/lib/roles';
import { badRequest, conflict, isOverlapViolation, isPrismaError, notFound } from '~/server/api/errors';
import { accountIdsMatching } from '~/server/api/customer-search';
import { closedMessage, storeWithHours } from '~/server/api/store-hours';
import { overlappingItem } from '~/server/api/overlap';
import { skiPublicSelect, withPlainModel } from '~/server/api/selects';
import { createTRPCRouter, protectedProcedure, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';

// Reservations are never deleted: cancelled and returned ones stay for the history (FR-60). Every
// status change goes through `~/lib/reservation-lifecycle` and is written as a conditional update on
// the expected status, so two people acting on one reservation at once cannot both succeed.

const NOT_FOUND = 'Reservation not found.';
const CODE_ATTEMPTS = 5;
const CHANGED_MEANWHILE = 'This reservation was changed in the meantime. Reload and try again.';
const ALREADY_BOOKED = 'Some of these skis are already booked for some of those days. Pick other dates or other skis.';

const reservationFields = {
  id: true,
  code: true,
  startDate: true,
  endDate: true,
  status: true,
  rentalDays: true,
  discountPercent: true,
  totalPrice: true,
  note: true,
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
  addresses: {
    select: {
      kind: true,
      recipient: true,
      companyId: true,
      vatId: true,
      street: true,
      houseNumber: true,
      city: true,
      zipCode: true,
      country: true,
    },
    orderBy: { kind: 'asc' },
  },
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
/** Everything staff need about one reservation: who, what, where, how much, and who did what when (FR-66). */
const staffReservationDetailSelect = {
  ...staffReservationSelect,
  addresses: {
    select: {
      kind: true,
      recipient: true,
      companyId: true,
      vatId: true,
      street: true,
      houseNumber: true,
      city: true,
      zipCode: true,
      country: true,
    },
    orderBy: { kind: 'asc' },
  },
} satisfies Prisma.ReservationSelect;

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

    // Pickup and return need the store open (BR-7).
    const store = await storeWithHours(ctx.db, storeId);
    if (!store) throw notFound('This store no longer exists.');
    const closed = closedRentalDays(rentalDays(store, input));
    if (closed.length > 0) throw badRequest(closedMessage(store, closed));

    const clash = await ctx.db.reservationItem.findFirst({
      where: { skiId: { in: input.skiIds }, ...overlappingItem(startDate, endDate) },
      select: { id: true },
    });

    if (clash) throw conflict(ALREADY_BOOKED);

    const quote = quoteReservation(
      skis.map((ski) => ({ skiId: ski.id, pricePerDay: toMoneyString(ski.model.pricePerDay) })),
      utcDaysBetween(startDate, endDate),
    );

    const userId = ctx.session.user.id;
    const { details } = input;
    const mailing = { kind: 'MAILING' as const, ...details.mailing, recipient: null, companyId: null, vatId: null };
    const invoice = details.invoiceToMailingAddress
      ? null
      : {
          kind: 'INVOICE' as const,
          ...details.invoice,
          companyId: details.invoice.companyId ?? null,
          vatId: details.invoice.vatId ?? null,
        };

    // 32⁶ codes make a clash rare, and a fresh code settles it.
    for (let attempt = 1; ; attempt++) {
      try {
        const reservation = await ctx.db.$transaction(async (tx) => {
          // What was entered becomes the profile's too, so the next booking starts from it (FR-6). An
          // invoice address the customer chose not to use this time stays in the profile.
          for (const { kind, ...address } of invoice ? [mailing, invoice] : [mailing]) {
            await tx.customerAddress.upsert({
              where: { userId_kind: { userId, kind } },
              create: { userId, kind, ...address },
              update: address,
            });
          }

          return tx.reservation.create({
            data: {
              code: generateReservationCode(),
              userId,
              storeId,
              startDate,
              endDate,
              rentalDays: quote.rentalDays,
              discountPercent: quote.discountPercent,
              totalPrice: quote.totalPrice,
              note: details.note || null,
              items: {
                create: quote.items.map((item) => ({
                  skiId: item.skiId,
                  startDate,
                  endDate,
                  pricePerDay: item.quote.pricePerDay,
                  totalPrice: item.quote.totalPrice,
                })),
              },
              addresses: { create: invoice ? [mailing, invoice] : [mailing] },
            },
            select: customerReservationSelect,
          });
        });

        return withPlainPrices(reservation);
      } catch (error) {
        // Only reachable when another booking committed between the check and the insert.
        if (isOverlapViolation(error)) throw conflict(ALREADY_BOOKED);
        if (isPrismaError(error, 'P2002') && attempt < CODE_ATTEMPTS) continue;
        throw error;
      }
    }
  }),

  /**
   * The reservation a customer is putting together, priced for its dates (FR-33). Skis that can no longer
   * be booked for those dates, or are from another store than the first ski, are returned with the reason
   * and left out of the totals, so the page can ask for them to be removed.
   */
  quote: userProcedure.input(reservationQuoteSchema).query(async ({ ctx, input }) => {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);

    const skis = await ctx.db.ski.findMany({
      where: { id: { in: input.skiIds } },
      select: {
        ...skiPublicSelect,
        storeId: true,
        isAvailable: true,
        deletedAt: true,
        reservationItems: { where: overlappingItem(startDate, endDate), select: { id: true }, take: 1 },
      },
    });
    const byId = new Map(skis.map((ski) => [ski.id, ski]));
    const found = input.skiIds.flatMap((id) => byId.get(id) ?? []);
    const storeId = found[0]?.storeId;

    const lines = found.map(({ reservationItems, storeId: skiStore, isAvailable, deletedAt, ...ski }) => {
      const problem =
        deletedAt || !isAvailable
          ? ('unavailable' as const)
          : reservationItems.length > 0
            ? ('booked' as const)
            : skiStore !== storeId
              ? ('otherStore' as const)
              : null;
      return { ski: withPlainModel(ski), problem };
    });

    const bookable = lines.filter((line) => line.problem === null);
    const quote =
      bookable.length > 0
        ? quoteReservation(
            bookable.map((line) => ({ skiId: line.ski.id, pricePerDay: line.ski.model.pricePerDay })),
            utcDaysBetween(startDate, endDate),
          )
        : null;
    const store = storeId ? await storeWithHours(ctx.db, storeId) : null;
    const days = store ? rentalDays(store, input) : null;

    return {
      store,
      /** Pickup and return days with the store's hours; a closed one blocks booking (BR-7). */
      days,
      closedDays: days ? closedRentalDays(days) : [],
      missing: input.skiIds.length - found.length,
      lines: lines.map((line) => ({
        ...line,
        quote: quote?.items.find((item) => item.skiId === line.ski.id)?.quote ?? null,
      })),
      totals: quote && {
        rentalDays: quote.rentalDays,
        discountPercent: quote.discountPercent,
        subtotal: quote.subtotal,
        discount: quote.discount,
        totalPrice: quote.totalPrice,
      },
    };
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

  /** Staff looking reservations up by customer or code, newest first (FR-65). */
  search: staffProcedure.input(reservationSearchSchema).query(async ({ ctx, input }) => {
    const where: Prisma.ReservationWhereInput = {
      code: input.code ? { contains: input.code } : undefined,
      storeId: input.storeId,
      status: input.status,
      userId: input.customer ? { in: await accountIdsMatching(ctx.db, input.customer) } : undefined,
    };
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

  /** The reservation a customer quotes at the counter (FR-45). Only its id, for opening its page. */
  byCode: staffProcedure.input(reservationByCodeSchema).query(async ({ ctx, input }) => {
    const reservation = await ctx.db.reservation.findUnique({ where: { code: input.code }, select: { id: true } });

    if (!reservation) throw notFound(`No reservation has the code ${input.code}.`);

    return reservation;
  }),

  /** One reservation in full, for its staff page (FR-66). */
  byId: staffProcedure.input(reservationIdSchema).query(async ({ ctx, input }) => {
    const reservation = await ctx.db.reservation.findUnique({
      where: { id: input.id },
      select: staffReservationDetailSelect,
    });

    if (!reservation) throw notFound(NOT_FOUND);

    return withPlainPrices(reservation);
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
