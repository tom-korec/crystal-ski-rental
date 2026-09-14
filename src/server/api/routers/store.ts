import { idSchema } from '~/lib/id-schema';
import { storeCreateSchema, storeUpdateSchema } from '~/lib/store-schema';
import { conflict, notFound, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { adminProcedure, createTRPCRouter, protectedProcedure } from '~/server/api/trpc';

import type { Prisma } from '../../../../generated/prisma/client';

// Readable by any signed-in account (customers need addresses, contacts and hours), writable by
// admins (FR-12).

const NAME_TAKEN = 'A store with that name already exists.';
const NOT_FOUND = 'Store not found.';

const storeSelect = {
  id: true,
  name: true,
  street: true,
  houseNumber: true,
  city: true,
  zipCode: true,
  phone: true,
  email: true,
  openingHoursMonday: true,
  openingHoursTuesday: true,
  openingHoursWednesday: true,
  openingHoursThursday: true,
  openingHoursFriday: true,
  openingHoursSaturday: true,
  openingHoursSunday: true,
} satisfies Prisma.StoreSelect;

export const storeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.store.findMany({
      select: { ...storeSelect, _count: { select: { skis: true } } },
      orderBy: { name: 'asc' },
    });

    return rows.map(({ _count, ...store }) => ({ ...store, skiCount: _count.skis }));
  }),

  byId: protectedProcedure.input(idSchema).query(async ({ ctx, input }) => {
    const store = await ctx.db.store.findUnique({ where: { id: input.id }, select: storeSelect });

    if (!store) throw notFound(NOT_FOUND);

    return store;
  }),

  create: adminProcedure.input(storeCreateSchema).mutation(async ({ ctx, input }) => {
    try {
      return await ctx.db.store.create({ data: input, select: storeSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN });
    }
  }),

  update: adminProcedure.input(storeUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    try {
      return await ctx.db.store.update({ where: { id }, data, select: storeSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2025: NOT_FOUND });
    }
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
