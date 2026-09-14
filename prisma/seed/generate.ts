import { randomUUID } from 'node:crypto';

import { addUtcDays, todayUtc } from '../../src/lib/date';
import { quoteRental } from '../../src/lib/pricing';
import { RATING_EDIT_WINDOW_MS } from '../../src/lib/rating-rules';
import type { ReservationStatus } from '../../src/lib/reservation-lifecycle';
import {
  CUSTOMER_NAMES,
  DEMO_ACCOUNTS,
  DEMO_PASSWORDS,
  LENGTHS_BY_GENDER,
  MODEL_COMMENTS,
  MODELS,
  OTHER_STAFF,
  REMOVED_CUSTOMERS,
  RENTAL_NOTES,
  type SeedAccount,
  STORES,
} from './data';

// Builds the whole demo data set in memory: the catalogue from `data.ts`, a fleet, and a reservation
// history around today. Nothing here touches the database, so the result can be checked before a single
// row is written.
//
// Dates are offsets from today, so the demo never goes stale. Randomness comes from a fixed-seed PRNG,
// so every run produces the same fleet, the same bookings and the same ratings.

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * HOUR_MS;

/* ---------------------------------------------------------------------------------------------------- */
/* Randomness and time                                                                                  */
/* ---------------------------------------------------------------------------------------------------- */

/** mulberry32: small, fast and reproducible, unlike `Math.random`. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(0x5c1_7e57);

function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
  const item = items[randomInt(0, items.length - 1)];
  if (item === undefined) throw new Error('pick() from an empty list');
  return item;
}

function chance(probability: number): boolean {
  return random() < probability;
}

export const NOW = new Date();
const TODAY = todayUtc();

/** A UTC-midnight date `offset` days from today. */
export function day(offset: number): Date {
  return addUtcDays(TODAY, offset);
}

/** A moment during opening hours `offset` days from today, never later than now. */
function momentOn(offset: number, fromHour = 7, toHour = 15): Date {
  const moment = day(offset).getTime() + randomInt(fromHour, toHour) * HOUR_MS + randomInt(0, 59) * MINUTE_MS;
  return new Date(Math.min(moment, NOW.getTime() - MINUTE_MS));
}

function hoursAfter(date: Date, hours: number): Date {
  return new Date(Math.min(date.getTime() + hours * HOUR_MS, NOW.getTime() - MINUTE_MS));
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/* ---------------------------------------------------------------------------------------------------- */
/* Rows                                                                                                 */
/* ---------------------------------------------------------------------------------------------------- */

export interface UserRow extends SeedAccount {
  id: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface SkiRow {
  id: string;
  inventoryCode: string;
  modelId: string;
  storeId: string;
  lengthCm: number;
  isAvailable: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface ReservationRow {
  id: string;
  skiId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  pricePerDay: string;
  rentalDays: number;
  discountPercent: number;
  totalPrice: string;
  createdAt: Date;
  pickedUpAt: Date | null;
  pickedUpById: string | null;
  returnedAt: Date | null;
  returnedById: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
}

export interface ReservationRatingRow {
  id: string;
  reservationId: string;
  score: number;
  note: string | null;
  createdAt: Date;
}

export interface ModelRatingRow {
  id: string;
  modelId: string;
  userId: string;
  reservationId: string;
  windowStartedAt: Date;
  score: number;
  comment: string | null;
  createdAt: Date;
}

export interface SeedData {
  stores: ((typeof STORES)[number] & { id: string })[];
  brands: { id: string; name: string }[];
  models: ((typeof MODELS)[number] & { id: string; brandId: string })[];
  users: UserRow[];
  skis: SkiRow[];
  reservations: ReservationRow[];
  reservationRatings: ReservationRatingRow[];
  modelRatings: ModelRatingRow[];
}

/* ---------------------------------------------------------------------------------------------------- */
/* Generation                                                                                           */
/* ---------------------------------------------------------------------------------------------------- */

const CATALOGUE_CREATED = momentOn(-400);
const FLEET_CREATED = momentOn(-200);

function toEmailPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function buildUsers(): UserRow[] {
  const generated: SeedAccount[] = CUSTOMER_NAMES.map((name) => {
    const [first = '', last = ''] = name.split(' ');
    return {
      key: toEmailPart(`${first}.${last}`),
      name,
      email: `${toEmailPart(first)}.${toEmailPart(last)}@example.test`,
      role: 'USER',
      password: DEMO_PASSWORDS.customer,
      removed: REMOVED_CUSTOMERS.has(name),
    };
  });

  return [...DEMO_ACCOUNTS, ...OTHER_STAFF, ...generated].map((account) => ({
    ...account,
    id: randomUUID(),
    createdAt: momentOn(-randomInt(120, 360)),
    deletedAt: account.removed ? momentOn(-randomInt(3, 12)) : null,
  }));
}

interface FleetPlan {
  skis: SkiRow[];
  /** Skis reserved for the scripted scenarios, so generated bookings never collide with them. */
  scripted: Map<string, SkiRow>;
}

function buildFleet(data: Pick<SeedData, 'stores' | 'models'>): FleetPlan {
  const skis: SkiRow[] = [];
  let sequence = 1;

  for (const [storeIndex, store] of data.stores.entries()) {
    const skiCount = storeIndex === 0 ? 16 : 11;

    for (let i = 0; i < skiCount; i++) {
      // Spread the models across stores without every store stocking the same ones.
      const model = data.models[(storeIndex * 5 + i * 7) % data.models.length];
      if (!model) throw new Error('Model index out of range');

      skis.push({
        id: randomUUID(),
        inventoryCode: `SK-${String(sequence++).padStart(4, '0')}`,
        modelId: model.id,
        storeId: store.id,
        lengthCm: pick(LENGTHS_BY_GENDER[model.gender]),
        isAvailable: true,
        deletedAt: null,
        createdAt: FLEET_CREATED,
      });
    }
  }

  // The first skis at Jasná carry the scripted scenarios below.
  const scripted = new Map(skis.slice(0, 11).map((ski) => [ski.inventoryCode, ski]));

  // The demo customer rents the same model twice, so the second rental can reopen their model rating.
  const first = skis[0];
  const second = skis[1];
  if (!first || !second) throw new Error('Fleet too small');
  const firstModel = data.models.find((model) => model.id === first.modelId);
  if (!firstModel) throw new Error('Model missing');
  second.modelId = first.modelId;
  second.lengthCm = LENGTHS_BY_GENDER[firstModel.gender].find((length) => length !== first.lengthCm) ?? first.lengthCm;

  // One ski taken out of rental (bookings stay honoured) and one retired with history.
  const lastAtPleso = skis.filter((ski) => ski.storeId === data.stores[2]?.id).at(-1);
  const lastAtDonovaly = skis.at(-1);
  if (!lastAtPleso || !lastAtDonovaly) throw new Error('Fleet too small');
  lastAtPleso.isAvailable = false;
  lastAtDonovaly.deletedAt = momentOn(-20);
  lastAtDonovaly.isAvailable = false;

  return { skis, scripted };
}

interface ReservationSpec {
  ski: SkiRow;
  user: UserRow;
  start: number;
  /** Exclusive, like the stored `endDate`. */
  end: number;
  status: ReservationStatus;
  /** Days from today of an early return; defaults to the last day of the rental. */
  returnedOn?: number;
  /** Overrides the return moment, for scenarios that need it within the last hour. */
  returnedAt?: Date;
}

function buildReservation(spec: ReservationSpec, data: SeedData, staff: UserRow[]): ReservationRow {
  const model = data.models.find((candidate) => candidate.id === spec.ski.modelId);
  if (!model) throw new Error(`Unknown model for ${spec.ski.inventoryCode}`);

  const startDate = day(spec.start);
  const endDate = day(spec.end);
  const quote = quoteRental(model.pricePerDay, daysBetween(startDate, endDate));

  const bookedOn = Math.min(spec.start - randomInt(1, 21), -1);
  const createdAt = new Date(Math.max(momentOn(bookedOn).getTime(), spec.user.createdAt.getTime() + HOUR_MS));

  const row: ReservationRow = {
    id: randomUUID(),
    skiId: spec.ski.id,
    userId: spec.user.id,
    startDate,
    endDate,
    status: spec.status,
    pricePerDay: quote.pricePerDay,
    rentalDays: quote.rentalDays,
    discountPercent: quote.discountPercent,
    totalPrice: quote.totalPrice,
    createdAt,
    pickedUpAt: null,
    pickedUpById: null,
    returnedAt: null,
    returnedById: null,
    cancelledAt: null,
    cancelledById: null,
  };

  if (spec.status === 'ACTIVE' || spec.status === 'RETURNED') {
    row.pickedUpAt = momentOn(spec.start, 7, 10);
    row.pickedUpById = pick(staff).id;
  }

  if (spec.status === 'RETURNED') {
    row.returnedAt = spec.returnedAt ?? momentOn(spec.returnedOn ?? spec.end - 1, 12, 16);
    row.returnedById = pick(staff).id;
  }

  if (spec.status === 'CANCELLED_BY_USER') {
    const latest = Math.min(spec.start - 1, 0);
    row.cancelledAt = new Date(Math.max(momentOn(latest).getTime(), createdAt.getTime() + HOUR_MS));
    row.cancelledById = spec.user.id;
  }

  if (spec.status === 'CANCELLED_BY_STORE') {
    row.cancelledAt = momentOn(Math.min(spec.start + 1, 0), 15, 16);
    row.cancelledById = pick(staff).id;
  }

  return row;
}

/** Scenarios the demo and the end-to-end tests rely on, all at the Jasná store. */
function scriptedSpecs(scripted: Map<string, SkiRow>, users: UserRow[]): ReservationSpec[] {
  const ski = (code: string) => {
    const found = scripted.get(code);
    if (!found) throw new Error(`Scripted ski ${code} missing`);
    return found;
  };
  const user = (key: string) => {
    const found = users.find((candidate) => candidate.key === key);
    if (!found) throw new Error(`Seed account ${key} missing`);
    return found;
  };

  const jan = user('customer');
  const zuzana = user('zuzana.horvathova');
  const michal = user('michal.balaz');
  const katarina = user('katarina.tothova');
  const martin = user('martin.varga');

  return [
    // The demo customer's history: a rated rental, a newer rental of the same model that may reopen the
    // model rating, a rental returned today and still inside its edit window, one out now, one upcoming
    // and one cancelled.
    { ski: ski('SK-0001'), user: jan, start: -30, end: -26, status: 'RETURNED' },
    { ski: ski('SK-0002'), user: jan, start: -9, end: -6, status: 'RETURNED' },
    {
      ski: ski('SK-0003'),
      user: jan,
      start: -3,
      end: 1,
      status: 'RETURNED',
      returnedAt: new Date(NOW.getTime() - 40 * MINUTE_MS),
    },
    { ski: ski('SK-0004'), user: jan, start: -1, end: 3, status: 'ACTIVE' },
    { ski: ski('SK-0005'), user: jan, start: 7, end: 12, status: 'CREATED' },
    { ski: ski('SK-0006'), user: jan, start: 14, end: 16, status: 'CANCELLED_BY_USER' },

    // The Jasná front desk has something in every list.
    { ski: ski('SK-0007'), user: zuzana, start: 0, end: 3, status: 'CREATED' },
    { ski: ski('SK-0008'), user: michal, start: -2, end: 2, status: 'CREATED' },
    { ski: ski('SK-0009'), user: katarina, start: -4, end: 1, status: 'ACTIVE' },
    { ski: ski('SK-0010'), user: martin, start: -6, end: -1, status: 'ACTIVE' },
    { ski: ski('SK-0011'), user: zuzana, start: -8, end: -5, status: 'CANCELLED_BY_STORE' },
  ];
}

/** A booking history for one ski, laid out day by day so its bookings can never overlap. */
function generatedSpecs(ski: SkiRow, customers: UserRow[]): ReservationSpec[] {
  const specs: ReservationSpec[] = [];
  const horizon = ski.deletedAt ? -25 : 40;
  let cursor = -80 + randomInt(0, 10);

  while (cursor < horizon) {
    const length = pick([1, 2, 2, 3, 3, 4, 5, 6, 7, 8, 11]);
    const start = cursor;
    const end = start + length;
    cursor = end + randomInt(1, 9);

    if (end > horizon) break;
    // Taken out of rental a while ago: only the bookings made before that remain ahead.
    if (!ski.isAvailable && start > 10) continue;

    const past = end <= 0;
    const current = start <= 0 && end > 0;
    const user = pick(past ? customers : customers.filter((customer) => !customer.deletedAt));

    let status: ReservationStatus;
    let returnedOn: number | undefined;

    if (past) {
      const roll = random();
      status = roll < 0.85 ? 'RETURNED' : roll < 0.93 ? 'CANCELLED_BY_USER' : 'CANCELLED_BY_STORE';
      if (status === 'RETURNED' && length > 2 && chance(0.1)) returnedOn = start + randomInt(0, length - 2);
    } else if (current) {
      status = start === 0 && chance(0.5) ? 'CREATED' : 'ACTIVE';
    } else {
      status = chance(0.88) ? 'CREATED' : 'CANCELLED_BY_USER';
    }

    specs.push({ ski, user, start, end, status, returnedOn });
  }

  return specs;
}

function buildRatings(data: SeedData): Pick<SeedData, 'reservationRatings' | 'modelRatings'> {
  const reservationRatings: ReservationRatingRow[] = [];
  const modelRatings: ModelRatingRow[] = [];
  const modelOf = new Map(data.skis.map((ski) => [ski.id, ski.modelId]));
  const settledBefore = NOW.getTime() - 2 * DAY_MS;

  for (const reservation of data.reservations) {
    if (reservation.status !== 'RETURNED' || !reservation.returnedAt) continue;
    if (reservation.returnedAt.getTime() > settledBefore || !chance(0.6)) continue;

    reservationRatings.push({
      id: randomUUID(),
      reservationId: reservation.id,
      score: pick([5, 5, 5, 4, 4, 4, 3, 2]),
      note: pick(RENTAL_NOTES),
      createdAt: hoursAfter(reservation.returnedAt, randomInt(1, 30)),
    });
  }

  // One model rating per customer per model, written through their latest settled rental of it.
  const latest = new Map<string, ReservationRow>();
  for (const reservation of data.reservations) {
    if (reservation.status !== 'RETURNED' || !reservation.returnedAt) continue;
    if (reservation.returnedAt.getTime() > settledBefore) continue;

    const key = `${reservation.userId}:${modelOf.get(reservation.skiId)}`;
    const current = latest.get(key);
    if (!current || (current.returnedAt ?? 0) < reservation.returnedAt) latest.set(key, reservation);
  }

  for (const [key, reservation] of latest) {
    if (!chance(0.65) || !reservation.returnedAt) continue;

    const [userId = '', modelId = ''] = key.split(':');
    const windowStartedAt = hoursAfter(reservation.returnedAt, randomInt(2, 40));

    modelRatings.push({
      id: randomUUID(),
      modelId,
      userId,
      reservationId: reservation.id,
      windowStartedAt,
      score: pick([5, 5, 4, 4, 4, 3, 3, 2, 1]),
      comment: pick(MODEL_COMMENTS),
      createdAt: windowStartedAt,
    });
  }

  return { reservationRatings, modelRatings };
}

/** Ratings the demo customer's scripted history needs, replacing any generated for those rentals. */
function scriptRatings(data: SeedData, janId: string): void {
  const jan = data.reservations
    .filter((reservation) => reservation.userId === janId)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const [older, newer, today] = jan.filter((reservation) => reservation.status === 'RETURNED');
  if (!older?.returnedAt || !newer || !today?.returnedAt) throw new Error('Scripted history incomplete');

  const modelOf = (reservation: ReservationRow) => data.skis.find((ski) => ski.id === reservation.skiId)?.modelId ?? '';
  const scripted = new Set([older.id, newer.id, today.id]);

  data.reservationRatings = data.reservationRatings.filter((rating) => !scripted.has(rating.reservationId));
  data.modelRatings = data.modelRatings.filter((rating) => rating.userId !== janId);

  // Locked long ago: the newer rental of the same model may reopen the model rating.
  data.reservationRatings.push({
    id: randomUUID(),
    reservationId: older.id,
    score: 5,
    note: 'The skis were ready when I arrived and the staff were lovely.',
    createdAt: hoursAfter(older.returnedAt, 3),
  });
  data.modelRatings.push({
    id: randomUUID(),
    modelId: modelOf(older),
    userId: janId,
    reservationId: older.id,
    windowStartedAt: hoursAfter(older.returnedAt, 3),
    score: 4,
    comment: 'Very stable on hard snow, but tiring by the afternoon.',
    createdAt: hoursAfter(older.returnedAt, 3),
  });

  // Submitted twenty minutes ago, so both are still editable.
  const twentyMinutesAgo = new Date(NOW.getTime() - 20 * MINUTE_MS);
  data.reservationRatings.push({
    id: randomUUID(),
    reservationId: today.id,
    score: 4,
    note: 'Early return was no problem.',
    createdAt: twentyMinutesAgo,
  });
  data.modelRatings.push({
    id: randomUUID(),
    modelId: modelOf(today),
    userId: janId,
    reservationId: today.id,
    windowStartedAt: twentyMinutesAgo,
    score: 5,
    comment: null,
    createdAt: twentyMinutesAgo,
  });

  if (twentyMinutesAgo.getTime() + RATING_EDIT_WINDOW_MS <= NOW.getTime()) {
    throw new Error('The scripted editable rating would already be locked');
  }
}

export function generateSeedData(): SeedData {
  const stores = STORES.map((store) => ({ ...store, id: randomUUID() }));
  const brands = [...new Set(MODELS.map((model) => model.brand))].sort().map((name) => ({ id: randomUUID(), name }));
  const models = MODELS.map((model) => {
    const brand = brands.find((candidate) => candidate.name === model.brand);
    if (!brand) throw new Error(`Unknown brand ${model.brand}`);
    return { ...model, id: randomUUID(), brandId: brand.id };
  });

  const users = buildUsers();
  const staff = users.filter((user) => user.role !== 'USER');
  const customers = users.filter((user) => user.role === 'USER' && user.key !== 'customer');

  const data: SeedData = {
    stores,
    brands,
    models,
    users,
    skis: [],
    reservations: [],
    reservationRatings: [],
    modelRatings: [],
  };
  const fleet = buildFleet(data);
  data.skis = fleet.skis;

  const specs = [
    ...scriptedSpecs(fleet.scripted, users),
    ...fleet.skis
      .filter((ski) => !fleet.scripted.has(ski.inventoryCode))
      .flatMap((ski) => generatedSpecs(ski, customers)),
  ];

  data.reservations = specs.map((spec) => buildReservation(spec, data, staff));

  // Removed accounts were removed after their last booking.
  for (const user of users.filter((candidate) => candidate.deletedAt)) {
    const last = data.reservations
      .filter((reservation) => reservation.userId === user.id)
      .reduce(
        (latest, reservation) =>
          Math.max(latest, reservation.createdAt.getTime(), reservation.returnedAt?.getTime() ?? 0),
        0,
      );
    if (user.deletedAt && last > user.deletedAt.getTime()) user.deletedAt = hoursAfter(new Date(last), 24);
  }

  Object.assign(data, buildRatings(data));

  const jan = users.find((user) => user.key === 'customer');
  if (!jan) throw new Error('Demo customer missing');
  scriptRatings(data, jan.id);

  return data;
}

export { CATALOGUE_CREATED };
