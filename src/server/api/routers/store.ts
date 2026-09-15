import { idSchema } from '~/lib/id-schema';
import { addUtcDays, toDateString, toUtcDate } from '~/lib/date';
import { DATE_HOLDING_STATUSES } from '~/lib/reservation-lifecycle';
import { specialDayRemoveSchema, specialDaySetSchema, storeCreateSchema, storeUpdateSchema } from '~/lib/store-schema';
import { conflict, notFound, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { storeSelect, withPlainSpecialDays } from '~/server/api/selects';
import { adminProcedure, createTRPCRouter, publicProcedure } from '~/server/api/trpc';

// Readable by anyone (visitors need addresses, contacts and hours before they have an account), writable
// by admins (FR-12, BR-7).

const NAME_TAKEN = 'A store with that name already exists.';
const NOT_FOUND = 'Store not found.';

export const storeRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.store.findMany({
      select: { ...storeSelect, _count: { select: { skis: true } } },
      orderBy: { name: 'asc' },
    });

    return rows.map(({ _count, ...store }) => ({ ...withPlainSpecialDays(store), skiCount: _count.skis }));
  }),

  byId: publicProcedure.input(idSchema).query(async ({ ctx, input }) => {
    const store = await ctx.db.store.findUnique({ where: { id: input.id }, select: storeSelect });

    if (!store) throw notFound(NOT_FOUND);

    return withPlainSpecialDays(store);
  }),

  create: adminProcedure.input(storeCreateSchema).mutation(async ({ ctx, input }) => {
    try {
      return withPlainSpecialDays(await ctx.db.store.create({ data: input, select: storeSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN });
    }
  }),

  update: adminProcedure.input(storeUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    try {
      return withPlainSpecialDays(await ctx.db.store.update({ where: { id }, data, select: storeSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2025: NOT_FOUND });
    }
  }),

  /**
   * Different hours for one date, or a closure (BR-7). Closing a day is refused while open reservations pick
   * up or return on it: those customers must be moved or cancelled first. Shorter hours are allowed.
   */
  setSpecialDay: adminProcedure.input(specialDaySetSchema).mutation(async ({ ctx, input }) => {
    const date = toUtcDate(input.date);

    if (input.hours === null) {
      const affected = await ctx.db.reservation.findMany({
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
      const day = await ctx.db.storeSpecialDay.upsert({
        where: { storeId_date: { storeId: input.storeId, date } },
        create: { storeId: input.storeId, date, hours: input.hours, name: input.name },
        update: { hours: input.hours, name: input.name },
        select: { date: true, hours: true, name: true },
      });
      return { ...day, date: toDateString(day.date) };
    } catch (error) {
      rethrowPrismaError(error, { P2003: NOT_FOUND });
    }
  }),

  removeSpecialDay: adminProcedure.input(specialDayRemoveSchema).mutation(async ({ ctx, input }) => {
    await ctx.db.storeSpecialDay.deleteMany({ where: { storeId: input.storeId, date: toUtcDate(input.date) } });
  }),

  delete: adminProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const skis = await ctx.db.ski.count({ where: { storeId: input.id } });

    if (skis > 0) {
      throw conflict(
        `This store still has ${countOf(skis, 'ski')}, including removed ones. Move the skis to another store first.`,
      );
    }

    try {
      await ctx.db.store.delete({ where: { id: input.id } });
    } catch (error) {
      rethrowPrismaError(error, { P2003: 'This store still has skis.', P2025: NOT_FOUND });
    }

    return { id: input.id };
  }),
});
