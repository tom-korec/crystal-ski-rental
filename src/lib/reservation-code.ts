import { z } from 'zod';

// The short code a customer quotes at the counter (FR-45). Capital letters and digits, without the ones
// that are easy to misread aloud or on a phone screen: O and 0, I and 1.

export const RESERVATION_CODE_LENGTH = 6;
export const RESERVATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const CODE_PATTERN = new RegExp(`^[${RESERVATION_CODE_ALPHABET}]{${RESERVATION_CODE_LENGTH}}$`);

/** A fresh random code. Uniqueness is the database's job; the caller retries on a clash. */
export function generateReservationCode(
  randomValues: (array: Uint8Array) => Uint8Array = (array) => crypto.getRandomValues(array),
): string {
  const bytes = randomValues(new Uint8Array(RESERVATION_CODE_LENGTH));
  // 32 symbols divide 256 evenly, so the modulo keeps every symbol equally likely.
  return Array.from(bytes, (byte) => RESERVATION_CODE_ALPHABET[byte % RESERVATION_CODE_ALPHABET.length]).join('');
}

/** What staff type or read out, as stored: case, spaces, dashes and a leading # do not matter. */
export const reservationCodeSchema = z
  .string()
  .transform((value) => value.toUpperCase().replace(/[\s#-]/g, ''))
  .pipe(z.string().regex(CODE_PATTERN, `Enter the ${RESERVATION_CODE_LENGTH}-character reservation code.`));
