import Decimal from 'decimal.js';
import { z } from 'zod';

// Money is exact end to end (NFR-7): `Decimal(10,2)` in the database, strings like "38.00" on the
// wire, and decimal.js for arithmetic. A JavaScript `number` never holds a price.

/** decimal.js with the rounding BR-4 asks for, independent of the library's global default. */
export const Money = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP });

export type MoneyValue = InstanceType<typeof Money>;

/** Up to 8 integer digits and 2 decimals: what fits in `Decimal(10,2)`. */
const MONEY_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export const moneySchema = z.string().regex(MONEY_PATTERN, 'Enter an amount like 38 or 38.50.');

/** Zod runs later checks even when the format check already failed, so this must not throw on garbage. */
export function isPositiveMoney(value: string): boolean {
  return MONEY_PATTERN.test(value) && new Money(value).greaterThan(0);
}

/** Two decimals, always: "38" becomes "38.00". Accepts anything decimal-like, including Prisma's `Decimal`. */
export function toMoneyString(value: string | { toString(): string }): string {
  return new Money(value.toString()).toFixed(2);
}
