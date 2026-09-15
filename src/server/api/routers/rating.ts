import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import { canWriteRating, modelRatingAccess, type RatingAccess, reservationRatingAccess } from '~/lib/rating-rules';
import { type RatingInput, modelRatingsSchema, ratingSchema } from '~/lib/rating-schema';
import { badRequest, conflict, isPrismaError, notFound } from '~/server/api/errors';
import { createTRPCRouter, staffProcedure, userProcedure } from '~/server/api/trpc';

import type { Prisma, PrismaClient } from '../../../../generated/prisma/client';

// After a rental, customers rate the rental experience and the ski model together (BR-40…42). Access
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
    select: {
      id: true,
      userId: true,
      status: true,
      returnedAt: true,
      items: { select: { ski: { select: { modelId: true } } } },
    },
  });

  if (reservation?.userId !== userId) throw notFound(NOT_FOUND);

  return reservation;
}

type OwnReservation = Awaited<ReturnType<typeof ownReservation>>;

/** One rental rating per reservation, editable for an hour after it was first submitted (BR-40). */
async function writeRentalRating(
  tx: Prisma.TransactionClient,
  reservation: OwnReservation,
  input: NonNullable<RatingInput['rental']>,
  now: Date,
) {
  const existing = await tx.reservationRating.findUnique({
    where: { reservationId: reservation.id },
    select: { id: true, createdAt: true },
  });
  const access = reservationRatingAccess(reservation, existing, now);

  if (!canWriteRating(access)) throw refusal(access);

  const data = { score: input.score, note: input.note ?? null };

  if (existing) await tx.reservationRating.update({ where: { id: existing.id }, data });
  // The window starts with the same clock reading as the model rating's, so both lock together.
  else await tx.reservationRating.create({ data: { ...data, reservationId: reservation.id, createdAt: now } });
}

/**
 * One model rating per customer per model, written through a returned reservation with a ski of that model (BR-41).
 * The model's average is recomputed with the model row locked, so two ratings saved at once cannot both
 * compute the average without the other.
 */
async function writeModelRating(
  tx: Prisma.TransactionClient,
  reservation: OwnReservation,
  userId: string,
  input: RatingInput['models'][number],
  now: Date,
) {
  const { modelId } = input;
  if (!reservation.items.some((item) => item.ski.modelId === modelId)) {
    throw badRequest('You can only rate skis that were in this rental.');
  }

  await tx.$queryRaw`SELECT id FROM ski_model WHERE id = ${modelId} FOR UPDATE`;

  const existing = await tx.modelRating.findUnique({
    where: { modelId_userId: { modelId, userId } },
    select: { reservationId: true, windowStartedAt: true },
  });
  const access = modelRatingAccess(reservation, existing, now);

  if (!canWriteRating(access)) throw refusal(access);

  const texts = { score: input.score, comment: input.comment ?? null };
  // A new or reopened rating starts its window now, tied to the reservation it was written through.
  const window = access === 'edit' ? {} : { reservationId: reservation.id, windowStartedAt: now };

  await tx.modelRating.upsert({
    where: { modelId_userId: { modelId, userId } },
    create: { modelId, userId, reservationId: reservation.id, windowStartedAt: now, ...texts },
    update: { ...texts, ...window },
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
}

export const ratingRouter = createTRPCRouter({
  /** Rate the rental and the ski models of one returned reservation at once, all or nothing (FR-42…44). */
  rate: userProcedure.input(ratingSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const reservation = await ownReservation(ctx.db, input.reservationId, userId);

    try {
      await ctx.db.$transaction(async (tx) => {
        const now = new Date();
        if (input.rental) await writeRentalRating(tx, reservation, input.rental, now);
        // Models in a fixed order, so two saves locking the same rows cannot deadlock.
        const models = input.models.toSorted((a, b) => a.modelId.localeCompare(b.modelId));
        for (const model of models) await writeModelRating(tx, reservation, userId, model, now);
      });
    } catch (error) {
      // Two first submissions at once: the second loses a unique constraint.
      if (isPrismaError(error, 'P2002')) throw conflict('This rental has just been rated. Reload to see it.');
      throw error;
    }
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
