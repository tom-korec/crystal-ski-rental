import { describe, expect, it } from 'vitest';

import {
  generateReservationCode,
  RESERVATION_CODE_ALPHABET,
  RESERVATION_CODE_LENGTH,
  reservationCodeSchema,
} from '~/lib/reservation-code';

describe('generateReservationCode', () => {
  it('draws six symbols from the unambiguous alphabet', () => {
    for (let run = 0; run < 200; run++) {
      const code = generateReservationCode();
      expect(code).toHaveLength(RESERVATION_CODE_LENGTH);
      expect([...code].every((symbol) => RESERVATION_CODE_ALPHABET.includes(symbol))).toBe(true);
    }
  });

  it('maps every byte onto the alphabet evenly', () => {
    const bytes = [0, 31, 32, 255, 64, 100];
    expect(generateReservationCode((array) => array.map((_, index) => bytes[index] ?? 0))).toBe('A9A9AE');
  });

  it('never uses O, I, 0 or 1', () => {
    expect(RESERVATION_CODE_ALPHABET).not.toMatch(/[OI01]/);
    expect(new Set(RESERVATION_CODE_ALPHABET).size).toBe(32);
  });
});

describe('reservationCodeSchema', () => {
  it.each([
    ['K7QX2M', 'K7QX2M'],
    ['k7qx2m', 'K7QX2M'],
    [' #K7Q-X2M ', 'K7QX2M'],
  ])('reads %j as %j', (input, code) => {
    expect(reservationCodeSchema.parse(input)).toBe(code);
  });

  it.each(['K7QX2', 'K7QX2MM', 'K7QX2O', 'K7Q12M', ''])('refuses %j', (input) => {
    expect(reservationCodeSchema.safeParse(input).success).toBe(false);
  });
});
