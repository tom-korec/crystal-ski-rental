import { describe, expect, it } from 'vitest';

import { SystemClock } from '~/server/services/clock';

// What every service that judges a date against "today" depends on: whole UTC days, never local ones
// (NFR-6). A clock that drifted into local time would move rentals by a day east of Greenwich.

describe('SystemClock', () => {
  const clock = new SystemClock();

  it('reads today as UTC midnight', () => {
    const today = clock.todayUtc();

    expect([today.getUTCHours(), today.getUTCMinutes(), today.getUTCSeconds(), today.getUTCMilliseconds()]).toEqual([
      0, 0, 0, 0,
    ]);
  });

  it('formats today as the same UTC day it reads', () => {
    expect(clock.today()).toBe(clock.todayUtc().toISOString().slice(0, 10));
  });

  it('reads the current moment', () => {
    expect(Math.abs(clock.now().getTime() - Date.now())).toBeLessThan(1000);
  });
});
