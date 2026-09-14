import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import {
  canWriteRating,
  editWindowEndsAt,
  modelRatingAccess,
  type RatingAccess,
  reservationRatingAccess,
} from '~/lib/rating-rules';
import { modelRatingsSchema, modelRatingUpsertSchema, reservationRatingUpsertSchema } from '~/lib/rating-schema';
import { badRequest, conflict, isPrismaError, notFound } from '~/server/api/errors';
import { createTRPCRouter, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { PrismaClient } from '../../../../generated/prisma/client';

// Customers rate twice after a rental (BR-40…42): the rental experience, and the ski model. Access
// follows `~/lib/rating-rules`, judged by the server clock. Texts are for staff only.

const NOT_FOUND = 'Reservation not found.';

function refusal(access: RatingAccess) {
  return access === 'notEligible'
    ? badRequest('You can rate a rental once the skis have been returned.')
    : conflict('A rating can only be changed within an hour of submitting it.');
}

/** The caller's own reservation, or not found, so other people's ids cannot be probed. */
async function ownReservation(db: PrismaClient, id: string, userId: string) {
  const reservation = await db.reservation.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, returnedAt: true, ski: { select: { modelId: true } } },
  });

  if (reservation?.userId !== userId) throw notFound(NOT_FOUND);

  return reservation;
}

export const ratingRouter = createTRPCRouter({
  /** One rental rating per reservation, editable for an hour after it was first submitted (BR-40). */
  upsertReservationRating: userProcedure.input(reservationRatingUpsertSchema).mutation(async ({ ctx, input }) => {
    const reservation = await ownReservation(ctx.db, input.reservationId, ctx.session.user.id);
    const existing = await ctx.db.reservationRating.findUnique({
      where: { reservationId: reservation.id },
      select: { id: true, createdAt: true },
    });
    const access = reservationRatingAccess(reservation, existing, new Date());

    if (!canWriteRating(access)) throw refusal(access);

    const data = { score: input.score, note: input.note ?? null };
    const select = { score: true, note: true, createdAt: true } as const;

    try {
      const rating = existing
        ? await ctx.db.reservationRating.update({ where: { id: existing.id }, data, select })
        : await ctx.db.reservationRating.create({ data: { ...data, reservationId: reservation.id }, select });

      return { ...rating, editableUntil: editWindowEndsAt(rating.createdAt) };
    } catch (error) {
      // Two first submissions at once: the second loses the unique constraint.
      if (isPrismaError(error, 'P2002')) throw conflict('This rental has just been rated. Reload to see it.');
      throw error;
    }
  }),

  /**
   * One model rating per customer per model, written through a returned reservation of that model (BR-41).
   * The model's average is recomputed in the same transaction, with the model row locked so two ratings
   * saved at once cannot both compute the average without the other.
   */
  upsertModelRating: userProcedure.input(modelRatingUpsertSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const reservation = await ownReservation(ctx.db, input.reservationId, userId);
    const modelId = reservation.ski.modelId;

    return ctx.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM ski_model WHERE id = ${modelId} FOR UPDATE`;

      const existing = await tx.modelRating.findUnique({
        where: { modelId_userId: { modelId, userId } },
        select: { reservationId: true, windowStartedAt: true },
      });
      const now = new Date();
      const access = modelRatingAccess(reservation, existing, now);

      if (!canWriteRating(access)) throw refusal(access);

      const texts = { score: input.score, comment: input.comment ?? null };
      // A new or reopened rating starts its window now, tied to the reservation it was written through.
      const window = access === 'edit' ? {} : { reservationId: reservation.id, windowStartedAt: now };

      const rating = await tx.modelRating.upsert({
        where: { modelId_userId: { modelId, userId } },
        create: { modelId, userId, reservationId: reservation.id, windowStartedAt: now, ...texts },
        update: { ...texts, ...window },
        select: { score: true, comment: true, reservationId: true, windowStartedAt: true },
      });

      const aggregate = await tx.modelRating.aggregate({
        where: { modelId },
        _avg: { score: true },
        _count: { _all: true },
      });

      await tx.skiModel.update({
        where: { id: modelId },
        data: { avgRating: aggregate._avg.score, ratingCount: aggregate._count._all },
      });

      return { ...rating, editableUntil: editWindowEndsAt(rating.windowStartedAt) };
    });
  }),

  /** All ratings of one model with comments and who wrote them, so staff can reply by e-mail (FR-14). */
  byModel: staffProcedure.input(modelRatingsSchema).query(async ({ ctx, input }) => {
    const where = { modelId: input.modelId };
    const total = await ctx.db.modelRating.count({ where });
    const page = Math.min(input.page, pageCount(total));

    const items = await ctx.db.modelRating.findMany({
      where,
      select: {
        id: true,
        score: true,
        comment: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      skip: skipForPage(page),
      take: PAGE_SIZE,
    });

    return { items, total, page };
  }),
});
