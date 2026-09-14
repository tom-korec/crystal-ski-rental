import { idSchema } from '~/lib/id-schema';
import { toMoneyString } from '~/lib/money';
import { skiModelCreateSchema, skiModelListSchema, skiModelUpdateSchema } from '~/lib/ski-model-schema';
import { conflict, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { adminProcedure, createTRPCRouter, protectedProcedure } from '~/server/api/trpc';

import type { Prisma } from '../../../../generated/prisma/client';

// Readable by any signed-in account (search filters, fleet forms), writable by admins (FR-11). The model
// carries the price, so a price change applies to every ski of the model from the next booking on;
// existing reservations keep their snapshot (BR-5).

const NAME_TAKEN = 'This brand already has a model with that name.';
const NOT_FOUND = 'Ski model not found.';
const BRAND_MISSING = 'The selected brand no longer exists.';

const skiModelSelect = {
  id: true,
  name: true,
  type: true,
  gender: true,
  skillLevel: true,
  pricePerDay: true,
  avgRating: true,
  ratingCount: true,
  brand: { select: { id: true, name: true } },
} satisfies Prisma.SkiModelSelect;

type SkiModelRow = Prisma.SkiModelGetPayload<{ select: typeof skiModelSelect }>;

/** Money as a string; the average rating is a display value, so a plain number is fine. */
function toSkiModel(row: SkiModelRow) {
  return {
    ...row,
    pricePerDay: toMoneyString(row.pricePerDay),
    avgRating: row.avgRating === null ? null : row.avgRating.toNumber(),
  };
}

export const skiModelRouter = createTRPCRouter({
  list: protectedProcedure.input(skiModelListSchema).query(async ({ ctx, input }) => {
    const rows = await ctx.db.skiModel.findMany({
      where: { brandId: input.brandId },
      // Soft-deleted skis are counted too: the foreign key restricts on them as well.
      select: { ...skiModelSelect, _count: { select: { skis: true } } },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    });

    return rows.map(({ _count, ...row }) => ({ ...toSkiModel(row), skiCount: _count.skis }));
  }),

  create: adminProcedure.input(skiModelCreateSchema).mutation(async ({ ctx, input }) => {
    try {
      return toSkiModel(await ctx.db.skiModel.create({ data: input, select: skiModelSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2003: BRAND_MISSING });
    }
  }),

  update: adminProcedure.input(skiModelUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    try {
      return toSkiModel(await ctx.db.skiModel.update({ where: { id }, data, select: skiModelSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2003: BRAND_MISSING, P2025: NOT_FOUND });
    }
  }),

  delete: adminProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const skis = await ctx.db.ski.count({ where: { modelId: input.id } });

    if (skis > 0) {
      throw conflict(`This model is still used by ${countOf(skis, 'ski')}, including removed ones.`);
    }

    try {
      await ctx.db.skiModel.delete({ where: { id: input.id } });
    } catch (error) {
      rethrowPrismaError(error, { P2003: 'This model is still used by skis.', P2025: NOT_FOUND });
    }

    return { id: input.id };
  }),
});
