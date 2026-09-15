import { describe, expect, it } from 'vitest';

import { OPENING_HOURS_FIELDS } from '~/lib/opening-hours';
import { phoneSchema, storeCreateSchema, zipCodeSchema } from '~/lib/store-schema';

describe('zipCodeSchema', () => {
  it.each([
    ['031 01', '03101'],
    ['03101', '03101'],
    [' 059 60 ', '05960'],
  ])('stores %j as %j', (input, stored) => {
    expect(zipCodeSchema.parse(input)).toBe(stored);
  });

  it.each(['3101', '031  01', '0310A', '031-01', ''])('refuses %j', (input) => {
    expect(zipCodeSchema.safeParse(input).success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it.each([
    ['+421 903 123 456', '+421903123456'],
    ['+421-52-446-1234', '+421524461234'],
  ])('stores %j as %j', (input, stored) => {
    expect(phoneSchema.parse(input)).toBe(stored);
  });

  it.each(['0903 123 456', '+0 903 123 456', '+421', 'call us'])('refuses %j', (input) => {
    expect(phoneSchema.safeParse(input).success).toBe(false);
  });
});

describe('storeCreateSchema', () => {
  const store = {
    name: 'Jasná',
    street: 'Demänovská dolina',
    houseNumber: '72',
    city: 'Liptovský Mikuláš',
    zipCode: '031 01',
    phone: '+421 903 123 456',
    email: 'jasna@crystalskirental.test',
    ...Object.fromEntries(OPENING_HOURS_FIELDS.map((field) => [field, '8:00-16:00'])),
  };

  it('stores a closed day as null, whether sent blank or null', () => {
    expect(storeCreateSchema.parse({ ...store, openingHoursSunday: '   ' }).openingHoursSunday).toBeNull();
    expect(storeCreateSchema.parse({ ...store, openingHoursSunday: null }).openingHoursSunday).toBeNull();
  });

  it('requires every weekday to be present, even if closed', () => {
    const withoutWednesday: Record<string, string> = { ...store };
    delete withoutWednesday.openingHoursWednesday;

    expect(storeCreateSchema.safeParse(withoutWednesday).success).toBe(false);
  });

  it('refuses hours that are not intervals', () => {
    expect(storeCreateSchema.safeParse({ ...store, openingHoursMonday: 'mornings' }).success).toBe(false);
  });
});
