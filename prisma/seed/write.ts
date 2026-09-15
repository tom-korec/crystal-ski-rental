import { randomUUID } from 'node:crypto';

import { hashPassword } from 'better-auth/crypto';

import type { PrismaClient } from '../../generated/prisma/client';
import { DATE_HOLDING_STATUSES } from '../../src/lib/reservation-lifecycle';
import type { SeedData } from './rows';

/** Replaces everything in the database with the seed data, in one transaction. */
export async function writeSeedData(db: PrismaClient, data: SeedData): Promise<void> {
  // Scrypt is slow on purpose, so each distinct demo password is hashed once.
  const hashes = new Map<string, string>();
  for (const password of new Set(data.users.map((user) => user.password))) {
    hashes.set(password, await hashPassword(password));
  }

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`TRUNCATE store_special_day, customer_address, reservation_address, model_rating, reservation_rating, reservation_item, reservation, ski, ski_model, brand, store, session, account, verification, rate_limit, "user" CASCADE`;

      await tx.store.createMany({
        data: data.stores.map(({ slug: _slug, openingHours, ...store }) => ({
          ...store,
          updatedAt: store.createdAt,
          openingHoursMonday: openingHours[0],
          openingHoursTuesday: openingHours[1],
          openingHoursWednesday: openingHours[2],
          openingHoursThursday: openingHours[3],
          openingHoursFriday: openingHours[4],
          openingHoursSaturday: openingHours[5],
          openingHoursSunday: openingHours[6],
        })),
      });
      await tx.storeSpecialDay.createMany({
        data: data.specialDays.map((day) => ({ ...day, updatedAt: day.createdAt })),
      });
      await tx.brand.createMany({ data: data.brands.map((brand) => ({ ...brand, updatedAt: brand.createdAt })) });
      await tx.skiModel.createMany({ data: data.models.map((model) => ({ ...model, updatedAt: model.createdAt })) });

      await tx.user.createMany({
        data: data.users.map(({ password: _password, ...user }) => ({
          ...user,
          emailVerified: true,
          updatedAt: user.deletedAt ?? user.createdAt,
        })),
      });
      // The credential rows Better Auth writes on sign-up, so these accounts sign in normally.
      await tx.account.createMany({
        data: data.users.map((user) => ({
          id: randomUUID(),
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: hashes.get(user.password),
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
        })),
      });
      await tx.customerAddress.createMany({
        data: data.addresses.map((address) => ({ ...address, updatedAt: address.createdAt })),
      });

      await tx.ski.createMany({
        data: data.skis.map((ski) => ({ ...ski, updatedAt: ski.deletedAt ?? ski.createdAt })),
      });
      await tx.reservation.createMany({
        data: data.reservations.map(({ items: _items, ...reservation }) => ({
          ...reservation,
          updatedAt:
            reservation.cancelledAt ?? reservation.returnedAt ?? reservation.pickedUpAt ?? reservation.createdAt,
        })),
      });
      await tx.reservationItem.createMany({
        data: data.reservations.flatMap((reservation) =>
          reservation.items.map((item) => ({
            ...item,
            reservationId: reservation.id,
            startDate: reservation.startDate,
            endDate: reservation.endDate,
            holdsDates: (DATE_HOLDING_STATUSES as readonly string[]).includes(reservation.status),
          })),
        ),
      });
      await tx.reservationAddress.createMany({ data: data.reservationAddresses });
      await tx.reservationRating.createMany({
        data: data.reservationRatings.map((rating) => ({ ...rating, updatedAt: rating.createdAt })),
      });
      await tx.modelRating.createMany({
        data: data.modelRatings.map((rating) => ({ ...rating, updatedAt: rating.windowStartedAt })),
      });

      // The denormalised averages, from the same aggregate the rating API uses.
      await tx.$executeRaw`
        UPDATE ski_model AS m
        SET "avgRating" = r.avg, "ratingCount" = r.count
        FROM (SELECT "modelId", round(avg(score), 2) AS avg, count(*)::int AS count FROM model_rating GROUP BY "modelId") AS r
        WHERE m.id = r."modelId"`;
    },
    { timeout: 120_000 },
  );
}
