import { gendersMatching } from '~/lib/catalog';
import { todayUtc, toUtcDate, utcDaysBetween } from '~/lib/date';
import { mayChangeSkisAt, type StaffActor } from '~/lib/account-rules';
import { closedRentalDays, rentalDays as rentalDaysOf } from '~/lib/opening-hours';
import { idSchema } from '~/lib/id-schema';
import { BATCH_SIZE, nextCursor } from '~/lib/pagination';
import { quoteRental } from '~/lib/pricing';
import {
  skiCreateSchema,
  type SkiListInput,
  skiListSchema,
  skiSearchSchema,
  type SkiSort,
  skiUpdateSchema,
} from '~/lib/ski-schema';
import { conflict, forbidden, isPrismaError, notFound, rethrowPrismaError } from '~/server/api/errors';
import { overlappingItem } from '~/server/api/overlap';
import { storeWithHours } from '~/server/api/store-hours';
import { countOf } from '~/server/api/plural';
import { skiPublicSelect, withPlainModel } from '~/server/api/selects';
import { createTRPCRouter, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { Prisma } from '../../../../generated/prisma/client';

// Skis are soft-deleted once they have history, so reservations keep pointing at them (BR-32). Lists
// hide deleted skis; `byId` returns them with `deletedAt` so history can label them.

const NOT_FOUND = 'Ski not found.';
const CODE_TAKEN = 'Another ski already has that inventory code.';
const REFERENCE_MISSING = 'The selected model or store no longer exists.';

/** What customers may see: no inventory code, availability flag or timestamps (BR-50). */
const skiStaffSelect = {
  ...skiPublicSelect,
  inventoryCode: true,
  isAvailable: true,
  deletedAt: true,
  createdAt: true,
} satisfies Prisma.SkiSelect;

type CatalogueFilters = Omit<SkiListInput, 'inventoryCode' | 'cursor'>;

function modelWhere(filters: CatalogueFilters): Prisma.SkiModelWhereInput {
  return {
    brandId: filters.brandId,
    type: filters.type,
    gender: filters.gender ? { in: gendersMatching(filters.gender) } : undefined,
    skillLevel: filters.skillLevel,
  };
}

function skiWhere(filters: CatalogueFilters): Prisma.SkiWhereInput {
  return {
    deletedAt: null,
    modelId: filters.modelId,
    storeId: filters.storeId,
    lengthCm: { gte: filters.minLengthCm, lte: filters.maxLengthCm },
  };
}

/** Always tie-broken by id, so a batch boundary between equal rows cannot repeat or skip a card. */
const SEARCH_ORDER: Record<SkiSort, Prisma.SkiOrderByWithRelationInput[]> = {
  // Unrated models last rather than treated as zero.
  rating: [{ model: { avgRating: { sort: 'desc', nulls: 'last' } } }, { model: { name: 'asc' } }, { id: 'asc' }],
  priceAsc: [{ model: { pricePerDay: 'asc' } }, { model: { name: 'asc' } }, { id: 'asc' }],
  priceDesc: [{ model: { pricePerDay: 'desc' } }, { model: { name: 'asc' } }, { id: 'asc' }],
};

/** Managers change skis only at their own store (FR-64); the message says so rather than "not allowed". */
function assertMayChangeSkisAt(actor: StaffActor, storeId: string): void {
  if (!mayChangeSkisAt(actor, storeId)) {
    throw forbidden('You can only add or change skis at your own store.');
  }
}

export const skiRouter = createTRPCRouter({
  /** The fleet (FR-20). Includes skis taken out of rental: staff need to see those. */
  list: staffProcedure.input(skiListSchema).query(async ({ ctx, input }) => {
    const where: Prisma.SkiWhereInput = {
      ...skiWhere(input),
      model: modelWhere(input),
      inventoryCode: input.inventoryCode ? { contains: input.inventoryCode, mode: 'insensitive' } : undefined,
    };
    const cursor = input.cursor ?? 0;

    const [rows, total] = await ctx.db.$transaction([
      ctx.db.ski.findMany({
        where,
        select: skiStaffSelect,
        orderBy: [{ inventoryCode: 'asc' }],
        skip: cursor,
        take: BATCH_SIZE,
      }),
      ctx.db.ski.count({ where }),
    ]);

    return { items: rows.map(withPlainModel), total, nextCursor: nextCursor(cursor, rows.length, total) };
  }),

  /**
   * The customer search (FR-30…34): in the fleet, offered for rental, and free on every chosen day.
   * Each result carries the quote for the chosen dates, computed exactly as the booking will be.
   */
  search: userProcedure.input(skiSearchSchema).query(async ({ ctx, input }) => {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);
    const rentalDays = utcDaysBetween(startDate, endDate);

    // Pickup and return need the store open (BR-7): on a closed day there is nothing to offer.
    const store = await storeWithHours(ctx.db, input.storeId);
    const days = store ? rentalDaysOf(store, input) : null;
    const closedDays = days ? closedRentalDays(days) : [];
    if (!days || closedDays.length > 0) return { items: [], total: 0, nextCursor: null, days, closedDays };

    const where: Prisma.SkiWhereInput = {
      ...skiWhere(input),
      isAvailable: true,
      model: {
        ...modelWhere(input),
        pricePerDay: input.maxPricePerDay ? { lte: input.maxPricePerDay } : undefined,
        avgRating: input.minRating ? { gte: input.minRating } : undefined,
      },
      reservationItems: { none: overlappingItem(startDate, endDate) },
    };
    const cursor = input.cursor ?? 0;

    const [rows, total] = await ctx.db.$transaction([
      ctx.db.ski.findMany({
        where,
        select: skiPublicSelect,
        orderBy: SEARCH_ORDER[input.sort],
        skip: cursor,
        take: BATCH_SIZE,
      }),
      ctx.db.ski.count({ where }),
    ]);

    const items = rows.map((row) => {
      const ski = withPlainModel(row);
      return { ...ski, quote: quoteRental(ski.model.pricePerDay, rentalDays) };
    });

    return { items, total, nextCursor: nextCursor(cursor, rows.length, total), days, closedDays };
  }),

  /** Staff detail (FR-23). Returns deleted skis too, because past reservations still point at them. */
  byId: staffProcedure.input(idSchema).query(async ({ ctx, input }) => {
    const row = await ctx.db.ski.findUnique({ where: { id: input.id }, select: skiStaffSelect });

    if (!row) throw notFound(NOT_FOUND);

    return withPlainModel(row);
  }),

  create: staffProcedure.input(skiCreateSchema).mutation(async ({ ctx, input }) => {
    assertMayChangeSkisAt(ctx.session.user, input.storeId);

    try {
      return withPlainModel(await ctx.db.ski.create({ data: input, select: skiStaffSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: CODE_TAKEN, P2003: REFERENCE_MISSING });
    }
  }),

  /**
   * Taking a ski out of rental is never refused: it stops new bookings and honours existing ones
   * (BR-22). Moving it to another store is refused while a customer expects it where they booked it
   * (BR-30), checked on the change rather than the value, since the edit form resubmits every field.
   */
  update: staffProcedure.input(skiUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.ski.findFirst({ where: { id, deletedAt: null }, select: { storeId: true } });

    if (!existing) throw notFound(NOT_FOUND);

    // Both ends of a move: a manager can neither take a ski from another store nor send one there.
    assertMayChangeSkisAt(ctx.session.user, existing.storeId);
    if (data.storeId !== undefined) assertMayChangeSkisAt(ctx.session.user, data.storeId);

    if (data.storeId !== undefined && data.storeId !== existing.storeId) {
      const blocking = await ctx.db.reservation.count({
        where: {
          items: { some: { skiId: id } },
          OR: [{ status: 'ACTIVE' }, { status: 'CREATED', endDate: { gt: todayUtc() } }],
        },
      });

      if (blocking > 0) {
        throw conflict(
          `This ski has ${countOf(blocking, 'open reservation')} at its current store. Settle ${blocking === 1 ? 'it' : 'them'} before moving the ski.`,
        );
      }
    }

    try {
      return withPlainModel(await ctx.db.ski.update({ where: { id }, data, select: skiStaffSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: CODE_TAKEN, P2003: REFERENCE_MISSING, P2025: NOT_FOUND });
    }
  }),

  /**
   * Refused while any reservation still holds the ski (BR-31). Without any history the ski is removed
   * completely; with history it is soft-deleted and taken out of rental (BR-32).
   */
  delete: staffProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const ski = await ctx.db.ski.findFirst({
      where: { id: input.id, deletedAt: null },
      select: { id: true, storeId: true },
    });

    if (!ski) throw notFound(NOT_FOUND);

    assertMayChangeSkisAt(ctx.session.user, ski.storeId);

    const [open, history] = await ctx.db.$transaction([
      ctx.db.reservationItem.count({ where: { skiId: ski.id, holdsDates: true } }),
      ctx.db.reservationItem.count({ where: { skiId: ski.id } }),
    ]);

    if (open > 0) {
      throw conflict(
        `This ski has ${countOf(open, 'reservation')} that ${open === 1 ? 'is' : 'are'} booked or picked up. Settle ${open === 1 ? 'it' : 'them'} before deleting the ski.`,
      );
    }

    if (history === 0) {
      try {
        await ctx.db.ski.delete({ where: { id: ski.id } });
        return { id: ski.id, removedCompletely: true };
      } catch (error) {
        // A reservation arrived since the count. Soft-deleting instead is always safe.
        if (!isPrismaError(error, 'P2003')) rethrowPrismaError(error, { P2025: NOT_FOUND });
      }
    }

    await ctx.db.ski.update({ where: { id: ski.id }, data: { deletedAt: new Date(), isAvailable: false } });

    return { id: ski.id, removedCompletely: false };
  }),
});
