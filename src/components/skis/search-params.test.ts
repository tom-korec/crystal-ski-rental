import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseSearch, searchInput, serialiseSearch } from './search-params';

const STORE = '01a0a078-c1d1-77dc-b55f-e6e36f2aa171';

describe('search URL state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-17T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips the store, dates and every filter', () => {
    const state = parseSearch(
      new URLSearchParams(
        `store=${STORE}&from=2026-12-20&to=2026-12-25&type=PISTE&gender=WOMAN&level=EXPERT&minLength=150&maxLength=170&maxPrice=40&rating=4&sort=priceAsc`,
      ),
    );

    expect(state).toMatchObject({
      storeId: STORE,
      range: { startDate: '2026-12-20', endDate: '2026-12-25' },
      filters: { type: 'PISTE', minLengthCm: 150, maxPricePerDay: '40', minRating: 4, sort: 'priceAsc' },
    });
    expect(parseSearch(serialiseSearch(state))).toEqual(state);
  });

  it('has nothing to search until both a store and dates are picked', () => {
    expect(searchInput(parseSearch(new URLSearchParams()))).toBeNull();
    expect(searchInput(parseSearch(new URLSearchParams(`store=${STORE}`)))).toBeNull();
    expect(searchInput(parseSearch(new URLSearchParams('from=2026-12-20&to=2026-12-22')))).toBeNull();
    expect(searchInput(parseSearch(new URLSearchParams(`store=${STORE}&from=2026-12-20&to=2026-12-22`)))).toMatchObject(
      {
        storeId: STORE,
        startDate: '2026-12-20',
        endDate: '2026-12-22',
        sort: 'rating',
      },
    );
  });

  it('drops dates in the past but keeps the store and filters', () => {
    const state = parseSearch(new URLSearchParams(`store=${STORE}&from=2026-01-01&to=2026-01-03&type=FREERIDE`));

    expect(state.range).toBeUndefined();
    expect(state.storeId).toBe(STORE);
    expect(state.filters.type).toBe('FREERIDE');
  });

  it('drops a hand-edited value that is not valid instead of failing the whole search', () => {
    const state = parseSearch(new URLSearchParams('store=nope&from=2026-12-20&to=2026-12-22&type=SNOWBOARD&rating=9'));

    expect(state.storeId).toBeUndefined();
    expect(state.range).toEqual({ startDate: '2026-12-20', endDate: '2026-12-22' });
    expect(state.filters.type).toBeUndefined();
    expect(state.filters.minRating).toBeUndefined();
  });

  it('leaves the default sort and unset parts out of the URL', () => {
    expect(serialiseSearch({ filters: { sort: 'rating' } }).toString()).toBe('');
  });
});
