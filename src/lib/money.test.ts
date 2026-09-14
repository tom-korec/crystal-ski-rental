import { describe, expect, it } from 'vitest';

import { moneySchema, toMoneyString } from '~/lib/money';

describe('moneySchema', () => {
  it.each(['0', '38', '38.5', '38.50', '99999999.99'])('accepts %s', (value) => {
    expect(moneySchema.safeParse(value).success).toBe(true);
  });

  it.each(['', '-1', '38.505', '1e3', '38,50', ' 38', '123456789'])('refuses %j', (value) => {
    expect(moneySchema.safeParse(value).success).toBe(false);
  });
});

describe('toMoneyString', () => {
  it('always has two decimals', () => {
    expect(toMoneyString('38')).toBe('38.00');
    expect(toMoneyString('38.5')).toBe('38.50');
  });

  it('accepts decimal-like objects', () => {
    expect(toMoneyString({ toString: () => '12.3' })).toBe('12.30');
  });
});
