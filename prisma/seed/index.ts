/**
 * Resets the database to the demo data in `data/`: stores, catalogue, fleet, accounts, and a reservation
 * history around today with ratings. Safe to re-run; each run rebuilds everything from scratch.
 *
 * The data files are a committed snapshot. To change them, edit the hand-written files or re-run the
 * generator (`pnpm db:seed:generate`); see `generate/index.ts`.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../generated/prisma/client';
import { MIN_PASSWORD_LENGTH } from '../../src/lib/auth-schema';
import { assertSeedData } from './invariants';
import { loadSeedData } from './load';
import { writeSeedData } from './write';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  throw new Error('Refusing to seed with NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true to reset a demo.');
}

// The passwords in `data/` are public in the repository, so a deployed demo signs every account in with
// its own secret instead.
const productionPassword = process.env.SEED_PASSWORD;
if (isProduction && (!productionPassword || productionPassword.length < MIN_PASSWORD_LENGTH)) {
  throw new Error(`Set SEED_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) to seed with NODE_ENV=production.`);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Shown after seeding, so whoever ran it can sign in straight away. */
const DEMO_EMAILS = ['admin@crystalskirental.test', 'manager@crystalskirental.test', 'customer@crystalskirental.test'];

async function main() {
  const seedData = loadSeedData();
  const data =
    isProduction && productionPassword
      ? { ...seedData, users: seedData.users.map((user) => ({ ...user, password: productionPassword })) }
      : seedData;
  assertSeedData(data);
  await writeSeedData(db, data);

  const count = (status: string) => data.reservations.filter((reservation) => reservation.status === status).length;
  const customers = data.users.filter((user) => user.role === 'USER').length;

  console.log(
    `Seeded ${data.stores.length} stores, ${data.brands.length} brands, ${data.models.length} models, ${data.skis.length} skis, ` +
      `${customers} customers, ${data.users.length - customers} staff and ${data.reservations.length} reservations ` +
      `(${count('CREATED')} booked, ${count('ACTIVE')} out, ${count('RETURNED')} returned, ` +
      `${count('CANCELLED_BY_USER') + count('CANCELLED_BY_STORE')} cancelled), ` +
      `${data.reservationRatings.length} rental ratings and ${data.modelRatings.length} model ratings.`,
  );
  if (isProduction) {
    console.log('Every account signs in with SEED_PASSWORD.');
    return;
  }

  console.log('\nDemo accounts:');
  console.table(
    DEMO_EMAILS.flatMap((email) => {
      const user = data.users.find((candidate) => candidate.email === email);
      return user ? [{ role: user.role, email, password: user.password }] : [];
    }),
  );
  console.log('Store managers and customers sign in with the manager and customer passwords.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
