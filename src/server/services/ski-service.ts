import { mayChangeSkisAt, type StaffActor } from '~/lib/account-rules';
import { gendersMatching } from '~/lib/catalog';
import { toUtcDate, utcDaysBetween } from '~/lib/date';
import type { IdInput } from '~/lib/id-schema';
import { closedRentalDays, rentalDays as rentalDaysOf } from '~/lib/opening-hours';
import { BATCH_SIZE, nextCursor } from '~/lib/pagination';
import { quoteRental } from '~/lib/pricing';
import type { SkiCreateInput, SkiListInput, SkiSearch, SkiSort, SkiUpdateInput } from '~/lib/ski-schema';
import { conflict, forbidden, isPrismaError, notFound, rethrowPrismaError } from '~/server/api/errors';
import { overlappingItem } from '~/server/api/overlap';
import { countOf } from '~/server/api/plural';
import { skiPublicSelect, withPlainModel } from '~/server/api/selects';
import { storeWithHours } from '~/server/api/store-hours';
import type { Clock } from './clock';
import type { Services } from './types';

import type { Prisma, PrismaClient } from '../../../generated/prisma/client';

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

/**
 * Always tie-broken, so equal rows keep their order between requests. In the search, a model's lengths
 * follow each other, and within a length the pair with the lowest inventory code comes first.
 */
const SEARCH_ORDER: Record<SkiSort, Prisma.SkiOrderByWithRelationInput[]> = {
  // Unrated models last rather than treated as zero.
  rating: [
    { model: { avgRating: { sort: 'desc', nulls: 'last' } } },
    { model: { name: 'asc' } },
    { modelId: 'asc' },
    { lengthCm: 'asc' },
    { inventoryCode: 'asc' },
  ],
  priceAsc: [
    { model: { pricePerDay: 'asc' } },
    { model: { name: 'asc' } },
    { modelId: 'asc' },
    { lengthCm: 'asc' },
    { inventoryCode: 'asc' },
  ],
  priceDesc: [
    { model: { pricePerDay: 'desc' } },
    { model: { name: 'asc' } },
    { modelId: 'asc' },
    { lengthCm: 'asc' },
    { inventoryCode: 'asc' },
  ],
};

export class SkiService {
  private readonly db: PrismaClient;
  private readonly clock: Clock;

  constructor({ db, clock }: Services) {
    this.db = db;
    this.clock = clock;
  }

  /** The fleet (FR-20). Includes skis taken out of rental: staff need to see those. */
  async list(input: SkiListInput) {
    const where: Prisma.SkiWhereInput = {
      ...skiWhere(input),
      model: modelWhere(input),
      inventoryCode: input.inventoryCode ? { contains: input.inventoryCode, mode: 'insensitive' } : undefined,
    };
    const cursor = input.cursor ?? 0;

    const [rows, total] = await this.db.$transaction([
      this.db.ski.findMany({
        where,
        select: skiStaffSelect,
        orderBy: [{ inventoryCode: 'asc' }],
        skip: cursor,
        take: BATCH_SIZE,
      }),
      this.db.ski.count({ where }),
    ]);

    return { items: rows.map(withPlainModel), total, nextCursor: nextCursor(cursor, rows.length, total) };
  }

  /**
   * The customer search (FR-30…34): in the fleet, offered for rental, and free on every chosen day. Pairs
   * of the same model and length are one result, with the free pairs in the order they are handed out.
   * Each result carries the quote for the chosen dates, computed exactly as the booking will be.
   */
  async search(input: SkiSearch) {
    const startDate = toUtcDate(input.startDate);
    const endDate = toUtcDate(input.endDate);
    const rentalDays = utcDaysBetween(startDate, endDate);

    // Pickup and return need the store open (BR-7): on a closed day there is nothing to offer.
    const store = await storeWithHours(this.db, input.storeId);
    const days = store ? rentalDaysOf(store, input) : null;
    const closedDays = days ? closedRentalDays(days) : [];
    if (!days || closedDays.length > 0) {
      return { items: [], total: 0, pairs: 0, nextCursor: null, days, closedDays };
    }

    // One store's free pairs are few enough to group in memory, which keeps batches whole results.
    const rows = await this.db.ski.findMany({
      where: {
        ...skiWhere(input),
        isAvailable: true,
        model: {
          ...modelWhere(input),
          pricePerDay: input.maxPricePerDay ? { lte: input.maxPricePerDay } : undefined,
          avgRating: input.minRating ? { gte: input.minRating } : undefined,
        },
        reservationItems: { none: overlappingItem(startDate, endDate) },
      },
      select: skiPublicSelect,
      orderBy: SEARCH_ORDER[input.sort],
    });

    const groups = new Map<string, { ski: (typeof rows)[number]; skiIds: string[] }>();
    for (const row of rows) {
      const key = `${row.model.id}:${row.lengthCm}`;
      const group = groups.get(key);
      if (group) group.skiIds.push(row.id);
      else groups.set(key, { ski: row, skiIds: [row.id] });
    }

    const cursor = input.cursor ?? 0;
    const batch = [...groups.values()].slice(cursor, cursor + BATCH_SIZE);
    const items = batch.map(({ ski: row, skiIds }) => {
      const ski = withPlainModel(row);
      return { ...ski, skiIds, quote: quoteRental(ski.model.pricePerDay, rentalDays) };
    });

    return {
      items,
      total: groups.size,
      pairs: rows.length,
      nextCursor: nextCursor(cursor, items.length, groups.size),
      days,
      closedDays,
    };
  }

  /** Staff detail (FR-23). Returns deleted skis too, because past reservations still point at them. */
  async byId({ id }: IdInput) {
    const row = await this.db.ski.findUnique({ where: { id }, select: skiStaffSelect });

    if (!row) throw notFound(NOT_FOUND);

    return withPlainModel(row);
  }

  async create(actor: StaffActor, input: SkiCreateInput) {
    this.assertMayChangeSkisAt(actor, input.storeId);

    try {
      return withPlainModel(await this.db.ski.create({ data: input, select: skiStaffSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: CODE_TAKEN, P2003: REFERENCE_MISSING });
    }
  }

  /**
   * Taking a ski out of rental is never refused: it stops new bookings and honours existing ones
   * (BR-22). Moving it to another store is refused while a customer expects it where they booked it
   * (BR-30), checked on the change rather than the value, since the edit form resubmits every field.
   */
  async update(actor: StaffActor, { id, ...data }: SkiUpdateInput) {
    const existing = await this.db.ski.findFirst({ where: { id, deletedAt: null }, select: { storeId: true } });

    if (!existing) throw notFound(NOT_FOUND);

    // Both ends of a move: a manager can neither take a ski from another store nor send one there.
    this.assertMayChangeSkisAt(actor, existing.storeId);
    if (data.storeId !== undefined) this.assertMayChangeSkisAt(actor, data.storeId);

    if (data.storeId !== undefined && data.storeId !== existing.storeId) {
      const blocking = await this.db.reservation.count({
        where: {
          items: { some: { skiId: id } },
          OR: [{ status: 'ACTIVE' }, { status: 'CREATED', endDate: { gt: this.clock.todayUtc() } }],
        },
      });

      if (blocking > 0) {
        throw conflict(
          `This ski has ${countOf(blocking, 'open reservation')} at its current store. Settle ${blocking === 1 ? 'it' : 'them'} before moving the ski.`,
        );
      }
    }

    try {
      return withPlainModel(await this.db.ski.update({ where: { id }, data, select: skiStaffSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: CODE_TAKEN, P2003: REFERENCE_MISSING, P2025: NOT_FOUND });
    }
  }

  /**
   * Refused while any reservation still holds the ski (BR-31). Without any history the ski is removed
   * completely; with history it is soft-deleted and taken out of rental (BR-32).
   */
  async delete(actor: StaffActor, { id }: IdInput) {
    const ski = await this.db.ski.findFirst({ where: { id, deletedAt: null }, select: { id: true, storeId: true } });

    if (!ski) throw notFound(NOT_FOUND);

    this.assertMayChangeSkisAt(actor, ski.storeId);

    const [open, history] = await this.db.$transaction([
      this.db.reservationItem.count({ where: { skiId: ski.id, holdsDates: true } }),
      this.db.reservationItem.count({ where: { skiId: ski.id } }),
    ]);

    if (open > 0) {
      throw conflict(
        `This ski has ${countOf(open, 'reservation')} that ${open === 1 ? 'is' : 'are'} booked or picked up. Settle ${open === 1 ? 'it' : 'them'} before deleting the ski.`,
      );
    }

    if (history === 0) {
      try {
        await this.db.ski.delete({ where: { id: ski.id } });
        return { id: ski.id, removedCompletely: true };
      } catch (error) {
        // A reservation arrived since the count. Soft-deleting instead is always safe.
        if (!isPrismaError(error, 'P2003')) rethrowPrismaError(error, { P2025: NOT_FOUND });
      }
    }

    await this.db.ski.update({ where: { id: ski.id }, data: { deletedAt: this.clock.now(), isAvailable: false } });

    return { id: ski.id, removedCompletely: false };
  }

  /**
   * Managers change skis only at their own store (FR-64); the message says so rather than "not allowed".
   * The actor is handed in by the procedure — the service never reads the session.
   */
  private assertMayChangeSkisAt(actor: StaffActor, storeId: string): void {
    if (!mayChangeSkisAt(actor, storeId)) {
      throw forbidden('You can only add or change skis at your own store.');
    }
  }
}
