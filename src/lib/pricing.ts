import { Money, type MoneyValue } from '~/lib/money';

// Rental pricing (BR-1…5). The search quote and the booking snapshot both come from `quoteRental`,
// so the price a customer sees is the price that is saved.

export const MIN_RENTAL_DAYS = 1;
export const MAX_RENTAL_DAYS = 30;

/** Discount by rental length, applied to the whole rental (BR-3). */
export const DISCOUNT_TIERS = [
  { fromDays: 1, toDays: 3, percent: 0 },
  { fromDays: 4, toDays: 6, percent: 10 },
  { fromDays: 7, toDays: 10, percent: 15 },
  { fromDays: 11, toDays: 19, percent: 20 },
  { fromDays: 20, toDays: 30, percent: 25 },
] as const;

export function discountPercentFor(rentalDays: number): number {
  const tier = DISCOUNT_TIERS.find(({ fromDays, toDays }) => rentalDays >= fromDays && rentalDays <= toDays);

  if (!Number.isInteger(rentalDays) || !tier) {
    throw new RangeError(`A rental must be ${MIN_RENTAL_DAYS} to ${MAX_RENTAL_DAYS} whole days, got ${rentalDays}.`);
  }

  return tier.percent;
}

export interface RentalQuote {
  pricePerDay: string;
  rentalDays: number;
  subtotal: string;
  discountPercent: number;
  discount: string;
  totalPrice: string;
}

/**
 * `total = pricePerDay × days × (1 − discount)`, rounded half-up to the cent (BR-4). The discount is
 * derived as `subtotal − total`, so the three amounts on a receipt always add up.
 */
export function quoteRental(pricePerDay: string | MoneyValue, rentalDays: number): RentalQuote {
  const discountPercent = discountPercentFor(rentalDays);
  const price = new Money(pricePerDay);
  const subtotal = price.times(rentalDays);
  const total = subtotal
    .times(100 - discountPercent)
    .dividedBy(100)
    .toDecimalPlaces(2);

  return {
    pricePerDay: price.toFixed(2),
    rentalDays,
    subtotal: subtotal.toFixed(2),
    discountPercent,
    discount: subtotal.minus(total).toFixed(2),
    totalPrice: total.toFixed(2),
  };
}

export interface ReservationQuote<T> {
  rentalDays: number;
  discountPercent: number;
  subtotal: string;
  discount: string;
  totalPrice: string;
  /** The skis given, in the same order, each with its own quote. */
  items: (T & { quote: RentalQuote })[];
}

/**
 * A reservation of several skis for the same days (BR-6): every ski is quoted on its own, and the
 * reservation's amounts are the sums of the items' rounded amounts, so the lines always add up.
 */
export function quoteReservation<T extends { pricePerDay: string | MoneyValue }>(
  skis: readonly T[],
  rentalDays: number,
): ReservationQuote<T> {
  if (skis.length === 0) throw new RangeError('A reservation needs at least one ski.');

  const items = skis.map((ski) => ({ ...ski, quote: quoteRental(ski.pricePerDay, rentalDays) }));
  const sum = (field: 'subtotal' | 'discount' | 'totalPrice') =>
    items.reduce((total, item) => total.plus(item.quote[field]), new Money(0)).toFixed(2);

  return {
    rentalDays,
    discountPercent: discountPercentFor(rentalDays),
    subtotal: sum('subtotal'),
    discount: sum('discount'),
    totalPrice: sum('totalPrice'),
    items,
  };
}
