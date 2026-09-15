import { describe, expect, it } from 'vitest';

import { Money } from '~/lib/money';
import { discountPercentFor, quoteRental, quoteReservation } from '~/lib/pricing';

describe('discountPercentFor', () => {
  it.each([
    [1, 0],
    [3, 0],
    [4, 10],
    [6, 10],
    [7, 15],
    [10, 15],
    [11, 20],
    [19, 20],
    [20, 25],
    [30, 25],
  ])('%i days → %i %%', (days, percent) => {
    expect(discountPercentFor(days)).toBe(percent);
  });

  it.each([0, 31, -1, 2.5, Number.NaN])('refuses %d days', (days) => {
    expect(() => discountPercentFor(days)).toThrow(RangeError);
  });
});

describe('quoteRental', () => {
  it('prices a short rental without a discount', () => {
    expect(quoteRental('32.00', 3)).toEqual({
      pricePerDay: '32.00',
      rentalDays: 3,
      subtotal: '96.00',
      discountPercent: 0,
      discount: '0.00',
      totalPrice: '96.00',
    });
  });

  it('applies the discount to the whole rental, not only the days past the threshold', () => {
    expect(quoteRental('38.00', 5)).toMatchObject({ subtotal: '190.00', discount: '19.00', totalPrice: '171.00' });
  });

  it('avoids floating-point drift', () => {
    // In floating point, 19.99 × 7 × 0.85 is 118.94049999999999.
    expect(quoteRental('19.99', 7).totalPrice).toBe('118.94');
  });

  it('rounds half up, not to even', () => {
    // 8.05 × 5 × 0.9 = 36.225, which banker's rounding would make 36.22.
    expect(quoteRental('8.05', 5)).toMatchObject({ totalPrice: '36.23', discount: '4.02' });
  });

  it('keeps subtotal = discount + total exactly', () => {
    for (const days of [1, 4, 7, 11, 20, 30]) {
      const quote = quoteRental('11.11', days);
      expect(new Money(quote.discount).plus(quote.totalPrice).toFixed(2)).toBe(quote.subtotal);
    }
  });

  it('normalises the price to two decimals', () => {
    expect(quoteRental('25', 1)).toMatchObject({ pricePerDay: '25.00', totalPrice: '25.00' });
  });
});

describe('quoteReservation', () => {
  it('quotes every ski for the same days and adds up the rounded lines', () => {
    // 10 % off five days: 33.33 × 5 × 0.9 = 149.985 → 149.99, twice, is 299.98 (not 299.97 from the raw sum).
    const quote = quoteReservation(
      [
        { id: 'a', pricePerDay: '33.33' },
        { id: 'b', pricePerDay: '33.33' },
        { id: 'c', pricePerDay: '20' },
      ],
      5,
    );

    expect(quote.items.map((item) => [item.id, item.quote.totalPrice])).toEqual([
      ['a', '149.99'],
      ['b', '149.99'],
      ['c', '90.00'],
    ]);
    expect(quote).toMatchObject({
      rentalDays: 5,
      discountPercent: 10,
      subtotal: '433.30',
      discount: '43.32',
      totalPrice: '389.98',
    });
  });

  it('needs at least one ski', () => {
    expect(() => quoteReservation([], 3)).toThrow(RangeError);
  });
});
