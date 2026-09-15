import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { z } from 'zod';

import { invoiceAddressSchema, mailingAddressSchema } from '../../src/lib/address-schema';
import { toUtcDate, utcDaysBetween } from '../../src/lib/date';
import { quoteReservation } from '../../src/lib/pricing';
import type {
  CustomerAddressRow,
  ModelRatingRow,
  ReservationAddressRow,
  ReservationRatingRow,
  ReservationRow,
  SeedData,
  SkiRow,
  UserRow,
} from './rows';
import {
  brandFileSchema,
  customerFileSchema,
  modelFileSchema,
  reservationFileSchema,
  skiFileSchema,
  specialDayFileSchema,
  staffFileSchema,
  storeFileSchema,
} from './schema';
import { day, moment } from './time';

// Reads the committed data files and resolves them into rows. Files refer to each other by what people
// read, not by ids: stores by slug, models by "Brand Model", accounts by e-mail, skis by inventory code.

export const DATA_DIR = path.join(import.meta.dirname, 'data');

export function readJson<T>(schema: z.ZodType<T>, file: string): T {
  const parsed = schema.safeParse(JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8')));
  if (!parsed.success) throw new Error(`${file} is not valid seed data:\n${parsed.error.message}`);
  return parsed.data;
}

/** The files in a per-store folder, as [store slug, file name]. */
function perStore(folder: string): [string, string][] {
  return readdirSync(path.join(DATA_DIR, folder))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => [file.replace(/\.json$/, ''), path.join(folder, file)]);
}

function lookup<T>(map: Map<string, T>, key: string, what: string): T {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown ${what}: ${key}`);
  return value;
}

export function loadSeedData(): SeedData {
  const stores = readJson(storeFileSchema, 'stores.json').map(({ createdAt, ...store }) => ({
    ...store,
    id: randomUUID(),
    createdAt: moment(createdAt),
  }));
  const storeBySlug = new Map(stores.map((store) => [store.slug, store]));

  // Every store keeps the same holidays, entered the day after the store opened.
  const specialDays = readJson(specialDayFileSchema, 'special-days.json').flatMap((day) =>
    stores.map((store) => ({
      id: randomUUID(),
      storeId: store.id,
      date: toUtcDate(day.date),
      hours: day.hours,
      name: day.name,
      createdAt: new Date(store.createdAt.getTime() + 86_400_000),
    })),
  );

  const brands = readJson(brandFileSchema, 'brands.json').map(({ name, createdAt }) => ({
    id: randomUUID(),
    name,
    createdAt: moment(createdAt),
  }));
  const brandByName = new Map(brands.map((brand) => [brand.name, brand]));

  const models = readJson(modelFileSchema, 'models.json').map(({ brand, createdAt, ...model }) => ({
    ...model,
    id: randomUUID(),
    brandId: lookup(brandByName, brand, 'brand').id,
    createdAt: moment(createdAt),
    key: `${brand} ${model.name}`,
  }));
  const modelByKey = new Map(models.map((model) => [model.key, model]));

  const users: UserRow[] = [];
  const addresses: CustomerAddressRow[] = [];

  for (const member of readJson(staffFileSchema, 'staff.json')) {
    users.push({
      id: randomUUID(),
      name: member.name,
      email: member.email,
      password: member.password,
      role: member.role,
      storeId: member.store ? lookup(storeBySlug, member.store, 'store').id : null,
      createdAt: moment(member.createdAt),
      deletedAt: null,
    });
  }

  for (const customer of readJson(customerFileSchema, 'customers.json')) {
    const user: UserRow = {
      id: randomUUID(),
      name: customer.name,
      email: customer.email,
      password: customer.password,
      role: 'USER',
      storeId: null,
      createdAt: moment(customer.createdAt),
      deletedAt: customer.removedAt ? moment(customer.removedAt) : null,
    };
    users.push(user);

    // Through the API's own schemas, so the seed stores what a customer could have saved.
    const base = { id: '', userId: user.id, createdAt: user.createdAt };
    if (customer.mailing) {
      addresses.push({
        ...base,
        id: randomUUID(),
        kind: 'MAILING',
        ...mailingAddressSchema.parse(customer.mailing),
        recipient: null,
        companyId: null,
        vatId: null,
      });
    }
    if (customer.invoice) {
      const invoice = invoiceAddressSchema.parse(customer.invoice);
      addresses.push({
        ...base,
        id: randomUUID(),
        kind: 'INVOICE',
        ...invoice,
        companyId: invoice.companyId ?? null,
        vatId: invoice.vatId ?? null,
      });
    }
  }
  const userByEmail = new Map(users.map((user) => [user.email, user]));

  const skis: SkiRow[] = perStore('skis').flatMap(([slug, file]) =>
    readJson(skiFileSchema, file).map((ski) => ({
      id: randomUUID(),
      inventoryCode: ski.code,
      modelId: lookup(modelByKey, ski.model, 'model').id,
      storeId: lookup(storeBySlug, slug, 'store').id,
      lengthCm: ski.lengthCm,
      isAvailable: !ski.outOfRental && !ski.removedAt,
      deletedAt: ski.removedAt ? moment(ski.removedAt) : null,
      createdAt: moment(ski.createdAt),
    })),
  );
  const skiByCode = new Map(skis.map((ski) => [ski.inventoryCode, ski]));
  const modelById = new Map(models.map((model) => [model.id, model]));

  const reservations: ReservationRow[] = [];
  const reservationAddresses: ReservationAddressRow[] = [];
  const reservationRatings: ReservationRatingRow[] = [];
  const modelRatings: ModelRatingRow[] = [];

  for (const [slug, file] of perStore('reservations')) {
    const store = lookup(storeBySlug, slug, 'store');

    for (const entry of readJson(reservationFileSchema, file)) {
      const customer = lookup(userByEmail, entry.customer, 'account');
      const startDate = day(entry.start);
      const endDate = day(entry.end);
      const booked = entry.skis.map((code) => lookup(skiByCode, code, 'ski'));

      // Prices are the models' current ones, as if nothing changed since booking (BR-5).
      const quote = quoteReservation(
        booked.map((ski) => ({ skiId: ski.id, pricePerDay: lookup(modelById, ski.modelId, 'model').pricePerDay })),
        utcDaysBetween(startDate, endDate),
      );
      const staffId = (email: string) => lookup(userByEmail, email, 'account').id;

      const reservation: ReservationRow = {
        id: randomUUID(),
        code: entry.code,
        userId: customer.id,
        storeId: store.id,
        startDate,
        endDate,
        status: entry.status,
        items: quote.items.map((item) => ({
          id: randomUUID(),
          skiId: item.skiId,
          pricePerDay: item.quote.pricePerDay,
          totalPrice: item.quote.totalPrice,
        })),
        note: entry.note ?? null,
        rentalDays: quote.rentalDays,
        discountPercent: quote.discountPercent,
        totalPrice: quote.totalPrice,
        createdAt: moment(entry.createdAt),
        pickedUpAt: entry.pickedUp ? moment(entry.pickedUp.at) : null,
        pickedUpById: entry.pickedUp ? staffId(entry.pickedUp.by) : null,
        returnedAt: entry.returned ? moment(entry.returned.at) : null,
        returnedById: entry.returned ? staffId(entry.returned.by) : null,
        cancelledAt: entry.cancelled ? moment(entry.cancelled.at) : null,
        cancelledById: entry.cancelled ? staffId(entry.cancelled.by) : null,
      };
      reservations.push(reservation);

      // Bookings carry the addresses their customer has today, as if nothing changed since (FR-36).
      for (const address of addresses.filter((candidate) => candidate.userId === customer.id)) {
        reservationAddresses.push({
          id: randomUUID(),
          reservationId: reservation.id,
          kind: address.kind,
          recipient: address.recipient,
          companyId: address.companyId,
          vatId: address.vatId,
          street: address.street,
          houseNumber: address.houseNumber,
          city: address.city,
          zipCode: address.zipCode,
          country: address.country,
        });
      }

      if (entry.rating) {
        reservationRatings.push({
          id: randomUUID(),
          reservationId: reservation.id,
          score: entry.rating.score,
          note: entry.rating.note ?? null,
          createdAt: moment(entry.rating.at),
        });
      }

      for (const rating of entry.modelRatings ?? []) {
        const at = moment(rating.at);
        modelRatings.push({
          id: randomUUID(),
          modelId: lookup(modelByKey, rating.model, 'model').id,
          userId: customer.id,
          reservationId: reservation.id,
          windowStartedAt: at,
          score: rating.score,
          comment: rating.comment ?? null,
          createdAt: at,
        });
      }
    }
  }

  return {
    stores,
    specialDays,
    brands,
    models: models.map(({ key: _key, ...model }) => model),
    users,
    addresses,
    skis,
    reservations,
    reservationAddresses,
    reservationRatings,
    modelRatings,
  };
}
