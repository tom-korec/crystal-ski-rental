import { brandCreateSchema, brandUpdateSchema } from '~/lib/brand-schema';
import { idSchema } from '~/lib/id-schema';
import { conflict, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { adminProcedure, createTRPCRouter, publicProcedure } from '~/server/api/trpc';

// Readable by anyone (the public search filters), writable by admins (FR-10). Hard-deleted, and
// refused while a model still uses it (FR-13).

const NAME_TAKEN = 'A brand with that name already exists.';
const NOT_FOUND = 'Brand not found.';

const brandSelect = { id: true, name: true } as const;

export const brandRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) =>
    ctx.db.brand.findMany({
      select: { ...brandSelect, _count: { select: { models: true } } },
      orderBy: { name: 'asc' },
    }),
  ),

  create: adminProcedure.input(brandCreateSchema).mutation(async ({ ctx, input }) => {
    try {
      return await ctx.db.brand.create({ data: input, select: brandSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN });
    }
  }),

  update: adminProcedure.input(brandUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    try {
      return await ctx.db.brand.update({ where: { id }, data, select: brandSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2025: NOT_FOUND });
    }
  }),

  delete: adminProcedure.input(idSchema).mutation(async ({ ctx, input }) => {
    const models = await ctx.db.skiModel.count({ where: { brandId: input.id } });

    if (models > 0) {
      throw conflict(`This brand still has ${countOf(models, 'model')}. Delete or reassign the models first.`);
    }

    try {
      await ctx.db.brand.delete({ where: { id: input.id } });
    } catch (error) {
      // The count above gives the better message; this closes the race behind it.
      rethrowPrismaError(error, { P2003: 'This brand still has models.', P2025: NOT_FOUND });
    }

    return { id: input.id };
  }),
});
