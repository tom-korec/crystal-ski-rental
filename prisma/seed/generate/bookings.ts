import type { ReservationStatus } from '../../../src/lib/reservation-lifecycle';
import type { ReservationFile } from '../schema';
import type { GenCustomer } from './customers';
import { type FleetSki, isFree, SCRIPTED_SKI_COUNT } from './fleet';
import { BOOKING_NOTES } from './names';
import { at, between, minutesOf, type Random } from './random';

export type GenReservation = ReservationFile[number] & { store: string };

export interface StoreStaff {
  /** Store slug → the manager's e-mail. */
  managers: Map<string, string>;
  admin: string;
}

/** The earliest day anything happens on, one day inside the 90-day window so times never slip past it. */
const FIRST_DAY = -87;
const LAST_END = 90;

const LENGTHS = [
  [1, 10],
  [2, 18],
  [3, 22],
  [4, 16],
  [5, 14],
  [6, 8],
  [7, 8],
  [8, 3],
  [10, 1],
] as const;

const PAIRS = [
  [1, 78],
  [2, 16],
  [3, 4],
  [4, 2],
] as const;

/**
 * The generated history: each customer's quota of reservations, on free pairs, with statuses that follow
 * from the dates. The first store's front desk must show exactly the scripted items, so at that store
 * nothing generated is waiting for pickup, due back today or overdue.
 */
export function generateBookings(
  random: Random,
  customers: GenCustomer[],
  fleet: FleetSki[],
  staff: StoreStaff,
  scriptedCounts: Map<string, number>,
  codes: () => string,
): GenReservation[] {
  const reservations: GenReservation[] = [];
  const scriptedStore = fleet[0]?.store;
  const stores = [...new Set(fleet.map((ski) => ski.store))];

  for (const customer of customers) {
    if (customer.onlyScripted) continue;
    const wanted = customer.quota - (scriptedCounts.get(customer.email) ?? 0);

    for (let made = 0, attempts = 0; made < wanted && attempts < wanted * 60; attempts++) {
      const store = random.chance(0.75) ? customer.home : random.pick(stores);
      const reservation = tryBooking(random, customer, store, fleet, staff, store === scriptedStore);
      if (!reservation) continue;

      reservation.code = codes();
      reservations.push(reservation);
      made++;
    }
  }

  return reservations;
}

function tryBooking(
  random: Random,
  customer: GenCustomer,
  store: string,
  fleet: FleetSki[],
  staff: StoreStaff,
  isScriptedStore: boolean,
): GenReservation | null {
  const past = customer.removedOnDay !== null || random.chance(0.62);
  const start = past ? random.int(FIRST_DAY + 1, 0) : random.int(1, LAST_END - 5);
  const end = start + random.weighted(LENGTHS);
  if (end > LAST_END) return null;
  if (customer.removedOnDay !== null && end > customer.removedOnDay - 3) return null;

  const status = statusFor(random, start, end, isScriptedStore);
  if (!status) return null;

  const skis = pickPairs(random, customer, store, fleet, start, end);
  if (!skis) return null;

  // Most bookings are made a week or three ahead, some for the whole season; never before the demo's
  // history begins, and never today or later.
  const lead = random.weighted([
    [10, 40],
    [30, 30],
    [60, 18],
    [100, 12],
  ] as const);
  const bookedTo = Math.min(-1, start - 1);
  const bookedFrom = Math.max(FIRST_DAY, Math.min(start - lead, bookedTo));
  const createdAt = between(random, bookedFrom * 1440 + 7 * 60, bookedTo * 1440 + 22 * 60);

  const handler = () => (random.chance(0.85) ? (staff.managers.get(store) ?? staff.admin) : staff.admin);
  const reservation: GenReservation = {
    store,
    code: '',
    customer: customer.email,
    skis: skis.map((ski) => ski.code),
    start,
    end,
    status,
    createdAt,
    ...(random.chance(0.06) ? { note: random.pick(BOOKING_NOTES) } : {}),
  };

  if (status === 'ACTIVE' || status === 'RETURNED') {
    reservation.pickedUp = { at: between(random, start * 1440 + 8 * 60, start * 1440 + 11 * 60 + 30), by: handler() };
  }

  if (status === 'RETURNED') {
    // Now and then a pair comes back early; the customer still pays for the days they booked (BR-15).
    const returnDay = end - start > 2 && random.chance(0.08) ? random.int(start, end - 2) : end - 1;
    reservation.returned = {
      at: between(random, returnDay * 1440 + 12 * 60, returnDay * 1440 + 17 * 60 + 30),
      by: handler(),
    };
  }

  if (status === 'CANCELLED_BY_USER') {
    const from = minutesOf(createdAt) + 30;
    const to = Math.min(start - 1, -1) * 1440 + 22 * 60;
    if (from > to) return null;
    reservation.cancelled = { at: between(random, from, to), by: customer.email };
  }

  if (status === 'CANCELLED_BY_STORE') {
    reservation.cancelled = { at: at(start, 16, random.int(0, 11) * 5), by: handler() };
  }

  if (status !== 'CANCELLED_BY_USER' && status !== 'CANCELLED_BY_STORE') {
    for (const ski of skis) ski.busy.push([start, end]);
  }

  return reservation;
}

/**
 * What a reservation with these dates would be by now. Past rentals were mostly returned; current ones are
 * out; future ones are booked. At the scripted store, nothing generated may wait for pickup, be due back
 * today or be overdue, so its front desk lists only the scripted reservations.
 */
function statusFor(random: Random, start: number, end: number, isScriptedStore: boolean): ReservationStatus | null {
  if (start > 0) return random.chance(0.9) ? 'CREATED' : 'CANCELLED_BY_USER';

  if (end <= 0) {
    // A late return nobody has processed yet, only at the other stores.
    if (!isScriptedStore && end >= -2 && random.chance(0.05)) return 'ACTIVE';
    return random.weighted([
      ['RETURNED', 85],
      ['CANCELLED_BY_USER', 9],
      ...(start <= -1 ? ([['CANCELLED_BY_STORE', 6]] as const) : []),
    ] as const);
  }

  // The rental is on now.
  if (start === 0) return isScriptedStore ? null : 'CREATED';
  if (isScriptedStore) return end >= 2 ? 'ACTIVE' : null;
  return random.chance(0.94) ? 'ACTIVE' : 'CREATED';
}

/** One pair for the customer, and sometimes more for the people they ski with, all free for the dates. */
function pickPairs(
  random: Random,
  customer: GenCustomer,
  store: string,
  fleet: FleetSki[],
  start: number,
  end: number,
): FleetSki[] | null {
  const available = fleet.filter(
    (ski, index) =>
      ski.store === store &&
      index >= SCRIPTED_SKI_COUNT &&
      !(ski.outOfRental && start > -20) &&
      isFree(ski, start, end),
  );
  const pairs = random.weighted(PAIRS);
  const chosen: FleetSki[] = [];

  for (let pair = 0; pair < pairs; pair++) {
    const forKid = pair > 0 && random.chance(0.55);
    const suits = (ski: FleetSki) =>
      !chosen.includes(ski) &&
      (forKid
        ? ski.model.gender === 'KID'
        : pair === 0
          ? ski.model.gender === customer.gender || ski.model.gender === 'UNISEX'
          : ski.model.gender !== 'KID');
    const candidates = available.filter(suits);
    if (candidates.length === 0) return pair === 0 ? null : chosen;
    chosen.push(random.pick(candidates));
  }

  return chosen;
}
