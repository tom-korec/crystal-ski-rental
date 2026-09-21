import { addUtcDays, toUtcDate, utcDaysBetween } from '~/lib/date';
import { LEGAL_VERSIONS } from '~/lib/legal';
import { toMoneyString } from '~/lib/money';
import { closedRentalDays, rentalDays } from '~/lib/opening-hours';
import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import { quoteReservation } from '~/lib/pricing';
import { generateReservationCode } from '~/lib/reservation-code';
import {
  canCancelAsStore,
  canCancelAsUser,
  canPickUp,
  canReturn,
  DATE_HOLDING_STATUSES,
} from '~/lib/reservation-lifecycle';
import type {
  FrontDeskInput,
  MyReservationsInput,
  ReservationByCodeInput,
  ReservationCreateInput,
  ReservationIdInput,
  ReservationQuoteInput,
  ReservationSearch,
  ReservationsBySkiInput,
  ReservationsByUserInput,
} from '~/lib/reservation-schema';
import { accountIdsMatching } from '~/server/api/customer-search';
import { badRequest, conflict, isOverlapViolation, isPrismaError, notFound } from '~/server/api/errors';
import { overlappingItem } from '~/server/api/overlap';
import { skiPublicSelect, withPlainModel } from '~/server/api/selects';
import { closedMessage, storeWithHours } from '~/server/api/store-hours';
import type { Clock } from './clock';
import {
  customerReservationSelect,
  HISTORY_ORDER,
  staffReservationDetailSelect,
  staffReservationSelect,
  withPlainPrices,
} from './reservation-selects';
import type { Services } from './types';

import type { Prisma, PrismaClient } from '../../../generated/prisma/client';

// Reservations are never deleted: cancelled and returned ones stay for the history (FR-60). Every
// status change goes through `~/lib/reservation-lifecycle` and is written as a conditional update on
// the expected status, so two people acting on one reservation at once cannot both succeed.

const NOT_FOUND = 'Reservation not found.';
const CODE_ATTEMPTS = 5;
const CHANGED_MEANWHILE = 'This reservation was changed in the meantime. Reload and try again.';
const ALREADY_BOOKED = 'Some of these skis are already booked for some of those days. Pick other dates or other skis.';

/** Who is cancelling, decided by the procedure from the caller's role rather than read here (BR-11). */
interface CancelInput extends ReservationIdInput {
  userId: string;
  byStore: boolean;
}

export class ReservationService {
  private readonly db: PrismaClient;
  private readonly clock: Clock;

  constructor({ db, clock }: Services) {
    this.db = db;
    this.clock = clock;
  }

  /**
   * Book one or more skis from one store for the same days (FR-33, BR-6). The database constraint is
   * what prevents double booking (BR-20); the query before the insert only exists to answer the
   * ordinary case with a readable message. Prices are quoted from the models' current prices and saved
   * on the items (BR-5).
   */
  async create(userId: string, input: ReservationCreateInput) {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);

    if (input.rentalAgreementVersion !== LEGAL_VERSIONS.rentalAgreement) {
      throw badRequest('The rental agreement has changed. Reload the page and accept the new version.');
    }

    const skis = await this.db.ski.findMany({
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
    const store = await storeWithHours(this.db, storeId);
    if (!store) throw notFound('This store no longer exists.');
    const closed = closedRentalDays(rentalDays(store, input));
    if (closed.length > 0) throw badRequest(closedMessage(store, closed));

    const clash = await this.db.reservationItem.findFirst({
      where: { skiId: { in: input.skiIds }, ...overlappingItem(startDate, endDate) },
      select: { id: true },
    });

    if (clash) throw conflict(ALREADY_BOOKED);

    const quote = quoteReservation(
      skis.map((ski) => ({ skiId: ski.id, pricePerDay: toMoneyString(ski.model.pricePerDay) })),
      utcDaysBetween(startDate, endDate),
    );

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
        const reservation = await this.db.$transaction(async (tx) => {
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
              rentalAgreementVersion: LEGAL_VERSIONS.rentalAgreement,
              rentalAgreementAcceptedAt: this.clock.now(),
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
  }

  /**
   * The reservation a customer is putting together, priced for its dates (FR-33). Skis that can no longer
   * be booked for those dates, or are from another store than the first ski, are returned with the reason
   * and left out of the totals, so the page can ask for them to be removed.
   */
  async quote(input: ReservationQuoteInput) {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);

    const skis = await this.db.ski.findMany({
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
    const store = storeId ? await storeWithHours(this.db, storeId) : null;
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
  }

  /**
   * A customer cancels their own booking before its first day; staff cancel any booking not yet
   * picked up, which is also how a no-show is recorded (BR-11).
   */
  async cancel({ id, userId, byStore }: CancelInput) {
    const reservation = await this.findForTransition(id);

    // Not found rather than forbidden, so a customer cannot probe other people's reservation ids.
    if (!byStore && reservation.userId !== userId) throw notFound(NOT_FOUND);

    if (byStore ? !canCancelAsStore(reservation) : !canCancelAsUser(reservation, this.clock.todayUtc())) {
      throw conflict(
        reservation.status !== 'CREATED'
          ? 'Only a booking that has not been picked up can be cancelled.'
          : 'This rental has already started, so it can no longer be cancelled online. Please contact the store.',
      );
    }

    const { count } = await this.db.reservation.updateMany({
      where: { id: reservation.id, status: 'CREATED' },
      data: {
        status: byStore ? 'CANCELLED_BY_STORE' : 'CANCELLED_BY_USER',
        cancelledAt: this.clock.now(),
        cancelledById: userId,
      },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }

  /** Staff hand the skis over, on a day within the rental period (BR-11). */
  async pickUp({ id }: ReservationIdInput, staffId: string) {
    const reservation = await this.findForTransition(id);
    const today = this.clock.todayUtc();

    if (!canPickUp(reservation, today)) {
      if (reservation.status !== 'CREATED') throw conflict('This reservation is not waiting for pickup.');
      if (reservation.startDate > today) throw badRequest('Skis can be picked up from the first day of the rental.');
      throw badRequest('The rental period is over. Cancel the booking as a no-show instead.');
    }

    const { count } = await this.db.reservation.updateMany({
      where: { id: reservation.id, status: 'CREATED' },
      data: { status: 'ACTIVE', pickedUpAt: this.clock.now(), pickedUpById: staffId },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }

  /**
   * Staff take the skis back, on any day. An early return keeps the agreed price and frees the rest of
   * the booked days, because returned reservations hold no dates (BR-15).
   */
  async markReturned({ id }: ReservationIdInput, staffId: string) {
    const reservation = await this.findForTransition(id);

    if (!canReturn(reservation)) throw conflict('Only skis that have been picked up can be returned.');

    const { count } = await this.db.reservation.updateMany({
      where: { id: reservation.id, status: 'ACTIVE' },
      data: { status: 'RETURNED', returnedAt: this.clock.now(), returnedById: staffId },
    });

    if (count === 0) throw conflict(CHANGED_MEANWHILE);

    return { id: reservation.id };
  }

  /**
   * One customer's own reservations, newest first (FR-40). Each carries their ratings of the ski models
   * in it, so the screen can tell whether this reservation may create, edit or reopen each one.
   */
  async listMine(userId: string, { page: requested }: MyReservationsInput) {
    const where = { userId };
    const { total, page, skip, take } = await this.pageOf(where, requested);
    const rows = await this.db.reservation.findMany({
      where,
      select: customerReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    const modelIds = [...new Set(rows.flatMap((row) => row.items.map((item) => item.ski.model.id)))];
    const modelRatings = await this.db.modelRating.findMany({
      where: { userId, modelId: { in: modelIds } },
      select: { modelId: true, score: true, comment: true, reservationId: true, windowStartedAt: true },
    });

    const items = rows.map((row) => {
      const models = new Set(row.items.map((item) => item.ski.model.id));
      return { ...withPlainPrices(row), modelRatings: modelRatings.filter((rating) => models.has(rating.modelId)) };
    });

    return { items, total, page };
  }

  /** Staff looking reservations up by customer or code, newest first (FR-65). */
  async search(input: ReservationSearch) {
    const where: Prisma.ReservationWhereInput = {
      code: input.code ? { contains: input.code } : undefined,
      storeId: input.storeId,
      status: input.status,
      userId: input.customer ? { in: await accountIdsMatching(this.db, input.customer) } : undefined,
    };

    return this.listStaffPage(where, input.page);
  }

  /** The reservation a customer quotes at the counter (FR-45). Only its id, for opening its page. */
  async byCode({ code }: ReservationByCodeInput) {
    const reservation = await this.db.reservation.findUnique({ where: { code }, select: { id: true } });

    if (!reservation) throw notFound(`No reservation has the code ${code}.`);

    return reservation;
  }

  /** One reservation in full, for its staff page (FR-66). */
  async byId({ id }: ReservationIdInput) {
    const reservation = await this.db.reservation.findUnique({
      where: { id },
      select: staffReservationDetailSelect,
    });

    if (!reservation) throw notFound(NOT_FOUND);

    return withPlainPrices(reservation);
  }

  /** Every reservation of one ski, for its detail page (FR-60). */
  bySki(input: ReservationsBySkiInput) {
    return this.listStaffPage({ items: { some: { skiId: input.skiId } } }, input.page);
  }

  /** Every reservation of one customer, for their account page (FR-60). */
  byUser(input: ReservationsByUserInput) {
    return this.listStaffPage({ userId: input.userId }, input.page);
  }

  /**
   * The front desk of one store (FR-50). The conditions are the SQL form of the due and overdue checks
   * in `~/lib/reservation-lifecycle`.
   */
  async frontDesk({ storeId }: FrontDeskInput) {
    const today = this.clock.todayUtc();
    const atStore = { storeId } satisfies Prisma.ReservationWhereInput;
    const list = (where: Prisma.ReservationWhereInput, orderBy: Prisma.ReservationOrderByWithRelationInput[]) =>
      this.db.reservation.findMany({ where: { ...atStore, ...where }, select: staffReservationSelect, orderBy });

    const [pickupsDueToday, overduePickups, returnsDueToday, overdueReturns] = await this.db.$transaction([
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
  }

  /**
   * What stands in the way of changing a ski, counted over its whole history rather than the page on
   * screen: `upcoming` bookings are honoured when it goes out of rental (BR-22), `upcoming` and `active`
   * block a move (BR-30), and `open` blocks deletion (BR-31).
   */
  async blockersBySki({ skiId }: Pick<ReservationsBySkiInput, 'skiId'>) {
    const today = this.clock.todayUtc();

    const holding = (where: Prisma.ReservationWhereInput) =>
      this.db.reservation.count({ where: { items: { some: { skiId } }, ...where } });

    const [upcoming, active, open] = await this.db.$transaction([
      holding({ status: 'CREATED', endDate: { gt: today } }),
      holding({ status: 'ACTIVE' }),
      holding({ status: { in: [...DATE_HOLDING_STATUSES] } }),
    ]);

    return { upcoming, active, open };
  }

  /** The three staff listings differ only in what they filter on. */
  private async listStaffPage(where: Prisma.ReservationWhereInput, requested: number) {
    const { total, page, skip, take } = await this.pageOf(where, requested);
    const rows = await this.db.reservation.findMany({
      where,
      select: staffReservationSelect,
      orderBy: HISTORY_ORDER,
      skip,
      take,
    });

    return { items: rows.map(withPlainPrices), total, page };
  }

  /** An overshooting page number is served the last page; `page` says which one came back. */
  private async pageOf(where: Prisma.ReservationWhereInput, requested: number) {
    const total = await this.db.reservation.count({ where });
    const page = Math.min(requested, pageCount(total));

    return { total, page, skip: skipForPage(page), take: PAGE_SIZE };
  }

  private async findForTransition(id: string) {
    const reservation = await this.db.reservation.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, startDate: true, endDate: true },
    });

    if (!reservation) throw notFound(NOT_FOUND);

    return reservation;
  }
}
