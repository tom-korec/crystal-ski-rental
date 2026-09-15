/**
 * Writes the generated half of the seed data: customers, the fleet and the reservation history, from the
 * hand-written stores, models and staff. Deterministic, so re-running it rewrites the same files unless
 * something here or in the hand-written files changed. Run with `pnpm db:seed:generate`, then commit the
 * files; the seed itself only reads them.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { generateReservationCode } from '../../../src/lib/reservation-code';
import { DATA_DIR, readJson } from '../load';
import { type CustomerFile, modelFileSchema, staffFileSchema, storeFileSchema } from '../schema';
import { type GenReservation, generateBookings } from './bookings';
import { buildCustomers, CUSTOMER_PASSWORD } from './customers';
import { buildFleet, toSkiFile } from './fleet';
import { at, between, createRandom, minutesOf } from './random';
import { addRatings } from './ratings';
import { scriptedReservations } from './scenarios';

const random = createRandom(0x5c1_7e57);

const stores = readJson(storeFileSchema, 'stores.json');
const models = readJson(modelFileSchema, 'models.json');
const staff = readJson(staffFileSchema, 'staff.json');

const admin = staff.find((member) => member.role === 'ADMIN')?.email ?? '';
const managers = new Map(staff.flatMap((member) => (member.store ? [[member.store, member.email] as const] : [])));
const firstStore = stores[0]?.slug ?? '';

const fleet = buildFleet(random, stores, models);
const customers = buildCustomers(random, stores);

const scripted = scriptedReservations(firstStore, managers.get(firstStore) ?? admin);
const todayReturn = scripted.find((reservation) => reservation.code === 'QBFNFL');
const todayModel = fleet.find((ski) => ski.code === todayReturn?.skis[0])?.modelKey ?? '';
for (const rating of todayReturn?.modelRatings ?? []) rating.model = todayModel;
for (const reservation of scripted) {
  if (reservation.status.startsWith('CANCELLED')) continue;
  for (const code of reservation.skis)
    fleet.find((ski) => ski.code === code)?.busy.push([reservation.start, reservation.end]);
}

const usedCodes = new Set(scripted.map((reservation) => reservation.code));
const nextCode = () => {
  for (;;) {
    const code = generateReservationCode((bytes) => bytes.map(() => Math.floor(random.next() * 256)));
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      return code;
    }
  }
};

const scriptedCounts = new Map<string, number>();
for (const reservation of scripted) {
  scriptedCounts.set(reservation.customer, (scriptedCounts.get(reservation.customer) ?? 0) + 1);
}

const generated = generateBookings(random, customers, fleet, { managers, admin }, scriptedCounts, nextCode);
const reservations: GenReservation[] = [...scripted, ...generated];
addRatings(random, generated, customers, fleet);

/** Every account exists before its first booking, and was created within the demo's 90 days. */
function customerFile(): CustomerFile {
  const earliest = -89 * 1440 + 6 * 60;
  return customers.map((customer) => {
    const bookings = reservations.filter((reservation) => reservation.customer === customer.email);
    const firstBooking = Math.min(...bookings.map((reservation) => minutesOf(reservation.createdAt)), -2 * 1440);
    const createdAt =
      customer.email === 'customer@crystalskirental.test'
        ? at(-60, 10)
        : between(random, Math.max(earliest, firstBooking - 20 * 1440), Math.max(earliest, firstBooking - 30));

    return {
      name: customer.name,
      email: customer.email,
      password: CUSTOMER_PASSWORD,
      createdAt,
      ...(customer.removedOnDay !== null ? { removedAt: at(customer.removedOnDay, 10) } : {}),
      ...(customer.mailing ? { mailing: customer.mailing } : {}),
      ...(customer.invoice ? { invoice: customer.invoice } : {}),
    };
  });
}

/** One record per line: readable, and a changed record is a one-line diff. */
function writeRecords(file: string, records: unknown[]): void {
  const lines = records.map((record) => `  ${JSON.stringify(record)}`);
  writeFileSync(path.join(DATA_DIR, file), `[\n${lines.join(',\n')}\n]\n`);
}

writeRecords('customers.json', customerFile());

for (const folder of ['skis', 'reservations']) {
  rmSync(path.join(DATA_DIR, folder), { recursive: true, force: true });
  mkdirSync(path.join(DATA_DIR, folder));
}

for (const store of stores) {
  writeRecords(path.join('skis', `${store.slug}.json`), toSkiFile(fleet.filter((ski) => ski.store === store.slug)));
  writeRecords(
    path.join('reservations', `${store.slug}.json`),
    reservations
      .filter((reservation) => reservation.store === store.slug)
      .sort((a, b) => a.start - b.start || a.code.localeCompare(b.code))
      .map(({ store: _store, ...reservation }) => reservation),
  );
}

const pairs = reservations.reduce((sum, reservation) => sum + reservation.skis.length, 0);
console.log(
  `Wrote ${customers.length} customers, ${fleet.length} skis and ${reservations.length} reservations (${pairs} pairs) ` +
    `across ${stores.length} stores.`,
);
