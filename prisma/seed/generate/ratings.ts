import type { GenCustomer } from './customers';
import type { GenReservation } from './bookings';
import type { FleetSki } from './fleet';
import { MODEL_COMMENTS, RENTAL_NOTES } from './names';
import { between, minutesOf, type Random } from './random';

/**
 * About half of the settled rentals get a rental rating, and customers rate a model through their latest
 * settled rental of it. Only rentals returned at least two days ago are rated, so every edit window has
 * closed; the demo customer's ratings are scripted instead.
 */
export function addRatings(
  random: Random,
  reservations: GenReservation[],
  customers: GenCustomer[],
  fleet: FleetSki[],
) {
  const scriptedOnly = new Set(customers.filter((customer) => customer.onlyScripted).map((customer) => customer.email));
  const removedOn = new Map(customers.map((customer) => [customer.email, customer.removedOnDay]));
  const skiByCode = new Map(fleet.map((ski) => [ski.code, ski]));

  const settled = reservations.filter((reservation) => {
    if (reservation.status !== 'RETURNED' || !reservation.returned || scriptedOnly.has(reservation.customer))
      return false;
    return minutesOf(reservation.returned.at) < -2 * 1440;
  });

  /** A moment after the return, before the day's end, and before the account was removed. */
  const afterReturn = (reservation: GenReservation, delay: number) => {
    const returned = minutesOf(reservation.returned?.at ?? '');
    const removed = removedOn.get(reservation.customer);
    const latest = Math.min(Math.floor(returned / 1440) * 1440 + 23 * 60, removed != null ? removed * 1440 : Infinity);
    return between(random, Math.min(returned + delay, latest), latest);
  };

  for (const reservation of settled) {
    if (!random.chance(0.5)) continue;
    const note = random.chance(0.4) ? random.pick(RENTAL_NOTES) : undefined;
    reservation.rating = {
      score: random.weighted([
        [5, 40],
        [4, 32],
        [3, 16],
        [2, 8],
        [1, 4],
      ] as const),
      ...(note ? { note } : {}),
      at: afterReturn(reservation, 60),
    };
  }

  const latest = new Map<string, { reservation: GenReservation; model: string }>();
  for (const reservation of settled) {
    for (const code of reservation.skis) {
      const model = skiByCode.get(code)?.modelKey ?? '';
      const key = `${reservation.customer}|${model}`;
      const current = latest.get(key);
      if (!current || minutesOf(current.reservation.returned?.at ?? '') < minutesOf(reservation.returned?.at ?? '')) {
        latest.set(key, { reservation, model });
      }
    }
  }

  for (const { reservation, model } of latest.values()) {
    if (!random.chance(0.5)) continue;
    const comment = random.chance(0.45) ? random.pick(MODEL_COMMENTS) : undefined;
    reservation.modelRatings = [
      ...(reservation.modelRatings ?? []),
      {
        model,
        score: random.weighted([
          [5, 30],
          [4, 34],
          [3, 20],
          [2, 10],
          [1, 6],
        ] as const),
        ...(comment ? { comment } : {}),
        at: afterReturn(reservation, 90),
      },
    ];
  }
}
