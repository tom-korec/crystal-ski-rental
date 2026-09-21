import { addUtcDays, toDateString, toUtcDate } from '~/lib/date';
import type { IdInput } from '~/lib/id-schema';
import { DATE_HOLDING_STATUSES } from '~/lib/reservation-lifecycle';
import type { SpecialDayRemoveInput, SpecialDaySetInput, StoreCreate, StoreUpdate } from '~/lib/store-schema';
import { conflict, notFound, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { storeSelect, withPlainSpecialDays } from '~/server/api/selects';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

// Readable by anyone (visitors need addresses, contacts and hours before they have an account), writable
// by admins (FR-12, BR-7).

const NAME_TAKEN = 'A store with that name already exists.';
const NOT_FOUND = 'Store not found.';

export class StoreService {
  private readonly db: PrismaClient;

  constructor({ db }: Services) {
    this.db = db;
  }

  async list() {
    const rows = await this.db.store.findMany({
      select: { ...storeSelect, _count: { select: { skis: true } } },
      orderBy: { name: 'asc' },
    });

    return rows.map(({ _count, ...store }) => ({ ...withPlainSpecialDays(store), skiCount: _count.skis }));
  }

  async byId({ id }: IdInput) {
    const store = await this.db.store.findUnique({ where: { id }, select: storeSelect });

    if (!store) throw notFound(NOT_FOUND);

    return withPlainSpecialDays(store);
  }

  async create(input: StoreCreate) {
    try {
      return withPlainSpecialDays(await this.db.store.create({ data: input, select: storeSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN });
    }
  }

  async update({ id, ...data }: StoreUpdate) {
    try {
      return withPlainSpecialDays(await this.db.store.update({ where: { id }, data, select: storeSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2025: NOT_FOUND });
    }
  }

  /**
   * Different hours for one date, or a closure (BR-7). Closing a day is refused while open reservations pick
   * up or return on it: those customers must be moved or cancelled first. Shorter hours are allowed.
   */
  async setSpecialDay(input: SpecialDaySetInput) {
    const date = toUtcDate(input.date);

    if (input.hours === null) {
      const affected = await this.db.reservation.findMany({
        where: {
          storeId: input.storeId,
          status: { in: [...DATE_HOLDING_STATUSES] },
          OR: [{ startDate: date }, { endDate: addUtcDays(date, 1) }],
        },
        select: { code: true },
        orderBy: { code: 'asc' },
      });

      if (affected.length > 0) {
        throw conflict(
          `The store cannot close that day: ${countOf(affected.length, 'reservation')} ${affected.length === 1 ? 'picks up or returns' : 'pick up or return'} on it (${affected.map((reservation) => reservation.code).join(', ')}). Move or cancel ${affected.length === 1 ? 'it' : 'them'} first.`,
        );
      }
    }

    try {
      const day = await this.db.storeSpecialDay.upsert({
        where: { storeId_date: { storeId: input.storeId, date } },
        create: { storeId: input.storeId, date, hours: input.hours, name: input.name },
        update: { hours: input.hours, name: input.name },
        select: { date: true, hours: true, name: true },
      });

      return { ...day, date: toDateString(day.date) };
    } catch (error) {
      rethrowPrismaError(error, { P2003: NOT_FOUND });
    }
  }

  async removeSpecialDay(input: SpecialDayRemoveInput) {
    await this.db.storeSpecialDay.deleteMany({ where: { storeId: input.storeId, date: toUtcDate(input.date) } });
  }

  async delete({ id }: IdInput) {
    const skis = await this.db.ski.count({ where: { storeId: id } });

    if (skis > 0) {
      throw conflict(
        `This store still has ${countOf(skis, 'ski')}, including removed ones. Move the skis to another store first.`,
      );
    }

    try {
      await this.db.store.delete({ where: { id } });
    } catch (error) {
      rethrowPrismaError(error, { P2003: 'This store still has skis.', P2025: NOT_FOUND });
    }

    return { id };
  }
}
