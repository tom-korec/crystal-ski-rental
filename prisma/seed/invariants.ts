import { quoteReservation } from '../../src/lib/pricing';
import { DATE_HOLDING_STATUSES } from '../../src/lib/reservation-lifecycle';
import { day, NOW, type SeedData } from './generate';

// The rules the database does not enforce, checked before anything is written, so the seed can never
// produce data the application would have refused.

function fail(message: string): never {
  throw new Error(`Seed invariant broken: ${message}`);
}

function assertUnique<T>(items: T[], key: (item: T) => string, what: string): void {
  const seen = new Set<string>();

  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) fail(`duplicate ${what} ${value}`);
    seen.add(value);
  }
}

export function assertSeedData(data: SeedData): void {
  assertUnique(data.users, (user) => user.email, 'e-mail');
  assertUnique(data.skis, (ski) => ski.inventoryCode, 'inventory code');
  assertUnique(data.models, (model) => `${model.brandId}:${model.name}`, 'model name');
  assertUnique(data.modelRatings, (rating) => `${rating.modelId}:${rating.userId}`, 'model rating');
  assertUnique(data.reservationRatings, (rating) => rating.reservationId, 'rental rating');

  for (const user of data.users) {
    if ((user.role === 'MANAGER') !== (user.storeId !== null))
      fail(`${user.email} must have a store if and only if they are a manager`);
  }

  const users = new Map(data.users.map((user) => [user.id, user]));
  const skis = new Map(data.skis.map((ski) => [ski.id, ski]));
  const models = new Map(data.models.map((model) => [model.id, model]));
  const reservations = new Map(data.reservations.map((reservation) => [reservation.id, reservation]));
  const today = day(0);

  for (const reservation of data.reservations) {
    const label = `reservation ${reservation.id}`;
    const user = users.get(reservation.userId) ?? fail(`${label} has no customer`);
    const itemSkis = reservation.items.map((item) => skis.get(item.skiId) ?? fail(`${label} has an unknown ski`));

    if (itemSkis.length === 0) fail(`${label} has no skis`);
    if (new Set(reservation.items.map((item) => item.skiId)).size !== itemSkis.length)
      fail(`${label} holds a ski twice`);
    if (itemSkis.some((ski) => ski.storeId !== reservation.storeId)) fail(`${label} mixes stores`);
    if (user.role !== 'USER') fail(`${label} is rented by staff`);
    if (reservation.createdAt > NOW) fail(`${label} was booked in the future`);
    if (reservation.createdAt < user.createdAt) fail(`${label} was booked before the account existed`);

    const quote = quoteReservation(
      itemSkis.map((ski) => ({ pricePerDay: (models.get(ski.modelId) ?? fail(`${label} has no model`)).pricePerDay })),
      reservation.rentalDays,
    );
    if (
      quote.discountPercent !== reservation.discountPercent ||
      quote.totalPrice !== reservation.totalPrice ||
      quote.items.some(
        (line, index) =>
          line.quote.pricePerDay !== reservation.items[index]?.pricePerDay ||
          line.quote.totalPrice !== reservation.items[index]?.totalPrice,
      )
    ) {
      fail(`${label} price snapshot does not match the quote`);
    }

    const days = Math.round((reservation.endDate.getTime() - reservation.startDate.getTime()) / 86_400_000);
    if (days !== reservation.rentalDays) fail(`${label} rentalDays does not match its dates`);

    const { pickedUpAt, returnedAt, cancelledAt } = reservation;

    switch (reservation.status) {
      case 'CREATED':
        if (pickedUpAt || returnedAt || cancelledAt) fail(`${label} is CREATED but has lifecycle timestamps`);
        break;
      case 'ACTIVE':
        if (!pickedUpAt || returnedAt || cancelledAt) fail(`${label} is ACTIVE without a pickup, or with a return`);
        if (reservation.startDate > today) fail(`${label} was picked up before its first day`);
        break;
      case 'RETURNED':
        if (!pickedUpAt || !returnedAt || cancelledAt) fail(`${label} is RETURNED without a pickup and return`);
        if (returnedAt < pickedUpAt) fail(`${label} was returned before it was picked up`);
        if (returnedAt > NOW) fail(`${label} was returned in the future`);
        break;
      case 'CANCELLED_BY_USER':
      case 'CANCELLED_BY_STORE':
        if (pickedUpAt || returnedAt || !cancelledAt) fail(`${label} is cancelled without a cancellation`);
        if (cancelledAt < reservation.createdAt || cancelledAt > NOW) {
          fail(`${label} was cancelled outside its lifetime`);
        }
        break;
    }

    if (
      itemSkis.some((ski) => ski.deletedAt) &&
      (DATE_HOLDING_STATUSES as readonly string[]).includes(reservation.status)
    ) {
      fail(`${label} still holds a removed ski`);
    }
  }

  // No ski holds two overlapping CREATED or ACTIVE reservations (the database enforces it too; this names the culprit).
  const holding = data.reservations
    .filter((reservation) => (DATE_HOLDING_STATUSES as readonly string[]).includes(reservation.status))
    .flatMap((reservation) => reservation.items.map((item) => ({ ...reservation, skiId: item.skiId })))
    .sort((a, b) => a.skiId.localeCompare(b.skiId) || a.startDate.getTime() - b.startDate.getTime());

  for (const [index, current] of holding.entries()) {
    const previous = holding[index - 1];
    if (previous?.skiId === current.skiId && current.startDate < previous.endDate) {
      fail(`reservations ${previous.id} and ${current.id} overlap`);
    }
  }

  for (const rating of data.reservationRatings) {
    const reservation = reservations.get(rating.reservationId) ?? fail(`rental rating ${rating.id} has no reservation`);
    const returnedAt = reservation.returnedAt ?? fail(`rental rating ${rating.id} is on an unreturned reservation`);
    if (rating.createdAt < returnedAt || rating.createdAt > NOW) {
      fail(`rental rating ${rating.id} was written outside its reservation's lifetime`);
    }
  }

  for (const rating of data.modelRatings) {
    const reservation = reservations.get(rating.reservationId) ?? fail(`model rating ${rating.id} has no reservation`);
    const returnedAt =
      reservation.returnedAt ?? fail(`model rating ${rating.id} was written through an unreturned reservation`);
    if (reservation.userId !== rating.userId) fail(`model rating ${rating.id} used someone else's reservation`);
    if (!reservation.items.some((item) => skis.get(item.skiId)?.modelId === rating.modelId)) {
      fail(`model rating ${rating.id} used a reservation without that model`);
    }
    if (rating.windowStartedAt < returnedAt || rating.windowStartedAt > NOW) {
      fail(`model rating ${rating.id} window started outside its reservation's lifetime`);
    }
  }
}
