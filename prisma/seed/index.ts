/**
 * Resets the database to the demo data set: stores, catalogue, fleet, accounts, and a reservation
 * history around today with ratings. Safe to re-run; each run rebuilds everything from scratch.
 */
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';
import { DEMO_ACCOUNTS } from './data';
import { CATALOGUE_CREATED, generateSeedData, type SeedData } from './generate';
import { assertSeedData } from './invariants';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  throw new Error('Refusing to seed with NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true to reset a demo.');
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function write(data: SeedData): Promise<void> {
  // Scrypt is slow on purpose, so each distinct demo password is hashed once.
  const hashes = new Map<string, string>();
  for (const password of new Set(data.users.map((user) => user.password))) {
    hashes.set(password, await hashPassword(password));
  }

  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`TRUNCATE model_rating, reservation_rating, reservation, ski, ski_model, brand, store, session, account, verification, "user" CASCADE`;

      const catalogueTimes = { createdAt: CATALOGUE_CREATED, updatedAt: CATALOGUE_CREATED };

      await tx.store.createMany({
        data: data.stores.map(({ hours, ...store }) => ({
          ...store,
          ...catalogueTimes,
          openingHoursMonday: hours[0],
          openingHoursTuesday: hours[1],
          openingHoursWednesday: hours[2],
          openingHoursThursday: hours[3],
          openingHoursFriday: hours[4],
          openingHoursSaturday: hours[5],
          openingHoursSunday: hours[6],
        })),
      });
      await tx.brand.createMany({ data: data.brands.map((brand) => ({ ...brand, ...catalogueTimes })) });
      await tx.skiModel.createMany({
        data: data.models.map(({ brand: _brand, ...model }) => ({ ...model, ...catalogueTimes })),
      });

      await tx.user.createMany({
        data: data.users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: true,
          role: user.role,
          deletedAt: user.deletedAt,
          createdAt: user.createdAt,
          updatedAt: user.createdAt,
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

      await tx.ski.createMany({
        data: data.skis.map((ski) => ({ ...ski, updatedAt: ski.deletedAt ?? ski.createdAt })),
      });
      await tx.reservation.createMany({
        data: data.reservations.map((reservation) => ({
          ...reservation,
          updatedAt:
            reservation.cancelledAt ?? reservation.returnedAt ?? reservation.pickedUpAt ?? reservation.createdAt,
        })),
      });
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
    { timeout: 60_000 },
  );
}

async function main() {
  const data = generateSeedData();
  assertSeedData(data);
  await write(data);

  const count = (status: string) => data.reservations.filter((reservation) => reservation.status === status).length;

  console.log(
    `Seeded ${data.stores.length} stores, ${data.brands.length} brands, ${data.models.length} models, ${data.skis.length} skis, ` +
      `${data.users.length} accounts and ${data.reservations.length} reservations ` +
      `(${count('CREATED')} booked, ${count('ACTIVE')} out, ${count('RETURNED')} returned, ` +
      `${count('CANCELLED_BY_USER') + count('CANCELLED_BY_STORE')} cancelled), ` +
      `${data.reservationRatings.length} rental ratings and ${data.modelRatings.length} model ratings.`,
  );
  console.log('\nDemo accounts:');
  console.table(DEMO_ACCOUNTS.map(({ role, email, password }) => ({ role, email, password })));
  console.log('Other customers: <first>.<last>@example.test with the customer password.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
