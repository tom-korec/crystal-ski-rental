import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rentalRangeSchema } from '~/lib/rental-range';

const TODAY = '2026-12-17';

function issues(startDate: string, endDate: string) {
  const result = rentalRangeSchema.safeParse({ startDate, endDate });
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('rentalRangeSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Late evening UTC, so a check against the local day instead of the UTC one would fail.
    vi.setSystemTime(new Date(`${TODAY}T23:30:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a one-day rental starting today', () => {
    expect(issues(TODAY, '2026-12-18')).toEqual([]);
  });

  it('accepts exactly the maximum length', () => {
    expect(issues(TODAY, '2027-01-16')).toEqual([]);
  });

  it('refuses one day over the maximum', () => {
    expect(issues(TODAY, '2027-01-17')).toEqual(['endDate']);
  });

  it('refuses a start in the past', () => {
    expect(issues('2026-12-16', '2026-12-18')).toEqual(['startDate']);
  });

  it('refuses an empty or backwards range', () => {
    expect(issues(TODAY, TODAY)).toEqual(['endDate']);
    expect(issues('2026-12-20', '2026-12-19')).toEqual(['endDate']);
  });

  it('refuses something that is not a date', () => {
    expect(issues('2026-13-01', '2026-12-18')).toContain('startDate');
  });
});
