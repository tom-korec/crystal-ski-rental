import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addToCart, parseCart, removeFromCart, startCart } from '~/lib/reservation-cart';
import { MAX_SKIS_PER_RESERVATION } from '~/lib/reservation-schema';

const JASNA = '0191e5f0-0000-7000-8000-000000000001';
const DONOVALY = '0191e5f0-0000-7000-8000-000000000002';
const ski = (n: number, storeId = JASNA) => ({ id: `0191e5f0-0000-7000-8000-${String(n).padStart(12, '0')}`, storeId });
const range = { startDate: '2026-12-20', endDate: '2026-12-25' };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-12-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('addToCart', () => {
  it('starts a cart with the first ski', () => {
    expect(addToCart(null, ski(1), range)).toEqual({
      kind: 'added',
      cart: { storeId: JASNA, ...range, skiIds: [ski(1).id] },
    });
  });

  it('adds another ski from the same store for the same dates', () => {
    const outcome = addToCart(startCart(ski(1), range), ski(2), range);
    expect(outcome.kind === 'added' && outcome.cart.skiIds).toEqual([ski(1).id, ski(2).id]);
  });

  it('does not add the same ski twice', () => {
    expect(addToCart(startCart(ski(1), range), ski(1), range)).toEqual({ kind: 'alreadyAdded' });
  });

  it('refuses a ski from another store, keeping the cart', () => {
    const cart = startCart(ski(1), range);
    expect(addToCart(cart, ski(2, DONOVALY), range)).toEqual({ kind: 'otherStore', cart });
  });

  it('refuses other dates before looking at the store', () => {
    const cart = startCart(ski(1), range);
    expect(addToCart(cart, ski(2, DONOVALY), { ...range, endDate: '2026-12-26' })).toEqual({
      kind: 'otherDates',
      cart,
    });
  });

  it(`stops at ${MAX_SKIS_PER_RESERVATION} skis`, () => {
    let cart = startCart(ski(1), range);
    for (let n = 2; n <= MAX_SKIS_PER_RESERVATION; n++) {
      const outcome = addToCart(cart, ski(n), range);
      if (outcome.kind !== 'added') throw new Error(outcome.kind);
      cart = outcome.cart;
    }
    expect(addToCart(cart, ski(99), range)).toEqual({ kind: 'full' });
  });
});

describe('removeFromCart', () => {
  it('removes one ski, and the cart with its last one', () => {
    const outcome = addToCart(startCart(ski(1), range), ski(2), range);
    if (outcome.kind !== 'added') throw new Error(outcome.kind);

    const one = removeFromCart(outcome.cart, ski(1).id);
    expect(one?.skiIds).toEqual([ski(2).id]);
    expect(one && removeFromCart(one, ski(2).id)).toBeNull();
  });
});

describe('parseCart', () => {
  it('reads a stored cart', () => {
    const cart = startCart(ski(1), range);
    expect(parseCart(JSON.parse(JSON.stringify(cart)))).toEqual(cart);
  });

  it.each([
    ['nothing', null],
    ['garbage', { skiIds: 'x' }],
    ['an empty cart', { storeId: JASNA, ...range, skiIds: [] }],
    [
      'dates that have started',
      { storeId: JASNA, startDate: '2026-11-30', endDate: '2026-12-02', skiIds: [ski(1).id] },
    ],
  ])('drops %s', (_case, value) => {
    expect(parseCart(value)).toBeNull();
  });
});
