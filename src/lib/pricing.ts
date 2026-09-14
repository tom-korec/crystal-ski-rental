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
