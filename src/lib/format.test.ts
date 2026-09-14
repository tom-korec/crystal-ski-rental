import { describe, expect, it } from 'vitest';

import { formatPhone, formatZipCode } from '~/lib/format';
import { phoneSchema, zipCodeSchema } from '~/lib/store-schema';

describe('formatZipCode', () => {
  it('adds the space Slovak zip codes are written with', () => {
    expect(formatZipCode('03101')).toBe('031 01');
  });

  it('round-trips through the schema that stores it', () => {
    expect(zipCodeSchema.parse(formatZipCode('97639'))).toBe('97639');
  });
});

describe('formatPhone', () => {
  it.each([
    ['+421903123456', '+421 903 123 456'],
    ['+420777123456', '+420 777 123 456'],
  ])('%s → %s', (stored, shown) => {
    expect(formatPhone(stored)).toBe(shown);
  });

  it('shows other numbers as stored', () => {
    expect(formatPhone('+4930123456')).toBe('+4930123456');
  });

  it('round-trips through the schema that stores it', () => {
    expect(phoneSchema.parse(formatPhone('+421000000105'))).toBe('+421000000105');
  });
});
