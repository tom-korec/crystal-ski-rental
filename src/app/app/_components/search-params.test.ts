import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultRange, parseSearch, serialiseSearch } from './search-params';

describe('search URL state', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-17T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('round-trips every filter', () => {
    const filters = parseSearch(
      new URLSearchParams(
        'from=2026-12-20&to=2026-12-25&store=01a0a078-c1d1-77dc-b55f-e6e36f2aa171&type=PISTE&gender=WOMAN&level=EXPERT&minLength=150&maxLength=170&maxPrice=40&rating=4&sort=priceAsc',
      ),
    );

    expect(filters).toMatchObject({
      startDate: '2026-12-20',
      endDate: '2026-12-25',
      type: 'PISTE',
      minLengthCm: 150,
      maxPricePerDay: '40',
      minRating: 4,
      sort: 'priceAsc',
    });
    expect(parseSearch(serialiseSearch(filters))).toEqual(filters);
  });

  it('uses the default window when there are no dates', () => {
    expect(parseSearch(new URLSearchParams())).toMatchObject({ ...defaultRange(), sort: 'rating' });
  });

  it('replaces dates in the past but keeps the other filters', () => {
    expect(parseSearch(new URLSearchParams('from=2026-01-01&to=2026-01-03&type=FREERIDE'))).toMatchObject({
      ...defaultRange(),
      type: 'FREERIDE',
    });
  });

  it('drops a hand-edited filter that is not valid instead of failing the whole search', () => {
    const filters = parseSearch(
      new URLSearchParams('from=2026-12-20&to=2026-12-22&type=SNOWBOARD&rating=9&store=nope'),
    );

    expect(filters).toMatchObject({ startDate: '2026-12-20', endDate: '2026-12-22' });
    expect(filters.type).toBeUndefined();
    expect(filters.minRating).toBeUndefined();
    expect(filters.storeId).toBeUndefined();
  });

  it('leaves the default sort out of the URL', () => {
    expect(serialiseSearch({ ...defaultRange(), sort: 'rating' }).has('sort')).toBe(false);
  });
});
