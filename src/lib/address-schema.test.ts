import { describe, expect, it } from 'vitest';

import { addressSaveSchema, invoiceAddressSchema, mailingAddressSchema } from '~/lib/address-schema';

const mailing = {
  street: 'Hlavná',
  houseNumber: '12/A',
  city: 'Poprad',
  zipCode: '058 01',
};

const invoice = { ...mailing, recipient: 'Novák Trade s.r.o.' };

describe('mailingAddressSchema', () => {
  it('defaults to Slovakia and stores the zip code without the space', () => {
    expect(mailingAddressSchema.parse(mailing)).toEqual({ ...mailing, zipCode: '05801', country: 'SK' });
  });

  it('checks Czech postal codes like Slovak ones', () => {
    expect(mailingAddressSchema.parse({ ...mailing, zipCode: '110 00', country: 'cz' })).toMatchObject({
      zipCode: '11000',
      country: 'CZ',
    });
    expect(mailingAddressSchema.safeParse({ ...mailing, zipCode: '1100', country: 'CZ' }).success).toBe(false);
  });

  it.each([
    ['AT', '6020'],
    ['PL', '34-500'],
    ['GB', 'SW1A 1AA'],
  ])('keeps a %s postal code as entered', (country, zipCode) => {
    expect(mailingAddressSchema.parse({ ...mailing, zipCode, country })).toMatchObject({ zipCode, country });
  });

  it.each([
    ['a Slovak code in the wrong format', { zipCode: '5801' }],
    ['an unknown country format', { zipCode: '#1', country: 'AT' }],
    ['a country that is not a code', { country: 'Slovakia' }],
    ['a blank street', { street: '  ' }],
  ])('refuses %s', (_case, change) => {
    expect(mailingAddressSchema.safeParse({ ...mailing, ...change }).success).toBe(false);
  });

  it('does not accept invoice fields', () => {
    expect(mailingAddressSchema.parse({ ...mailing, recipient: 'Someone' })).not.toHaveProperty('recipient');
  });
});

describe('invoiceAddressSchema', () => {
  it('needs a recipient', () => {
    expect(invoiceAddressSchema.safeParse(mailing).success).toBe(false);
  });

  it('stores company numbers without spaces, in capitals', () => {
    expect(invoiceAddressSchema.parse({ ...invoice, companyId: '12 345 678', vatId: 'sk 2020123456' })).toMatchObject({
      companyId: '12345678',
      vatId: 'SK2020123456',
    });
  });

  it('treats blank company numbers as none', () => {
    expect(invoiceAddressSchema.parse({ ...invoice, companyId: ' ', vatId: '' })).toMatchObject({
      companyId: null,
      vatId: null,
    });
  });

  it.each([
    ['company number', { companyId: '123' }],
    ['VAT number', { vatId: '2020123456' }],
  ])('refuses a malformed %s', (_case, change) => {
    expect(invoiceAddressSchema.safeParse({ ...invoice, ...change }).success).toBe(false);
  });
});

describe('addressSaveSchema', () => {
  it('validates the address by its kind', () => {
    expect(addressSaveSchema.safeParse({ kind: 'MAILING', address: mailing }).success).toBe(true);
    expect(addressSaveSchema.safeParse({ kind: 'INVOICE', address: mailing }).success).toBe(false);
    expect(addressSaveSchema.safeParse({ kind: 'OTHER', address: mailing }).success).toBe(false);
  });
});
