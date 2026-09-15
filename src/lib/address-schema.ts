import { z } from 'zod';

import { zipCodeSchema } from '~/lib/store-schema';

// A customer's mailing and invoice addresses (FR-6). Customers may live abroad, so the country is part
// of the address; Slovak and Czech postal codes share a format and are stored without the space.

export const ADDRESS_KINDS = ['MAILING', 'INVOICE'] as const;
export type AddressKind = (typeof ADDRESS_KINDS)[number];

export const ADDRESS_TEXT_MAX_LENGTH = 100;
export const DEFAULT_COUNTRY = 'SK';

const FIVE_DIGIT_POSTAL_CODE_COUNTRIES = new Set(['SK', 'CZ']);

const text = z.string().trim().min(1).max(ADDRESS_TEXT_MAX_LENGTH);

/** Optional company number: blank means none, spaces are dropped. */
function optionalCode(pattern: RegExp, message: string) {
  return z
    .string()
    .transform((value) => value.replace(/\s/g, '').toUpperCase())
    .pipe(z.union([z.literal(''), z.string().regex(pattern, message)]))
    .transform((value) => value || null)
    .nullish();
}

const addressFields = {
  street: text,
  houseNumber: z.string().trim().min(1).max(20),
  city: text,
  zipCode: z.string().trim().min(1).max(10),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Choose a country.')
    .default(DEFAULT_COUNTRY),
};

type AddressFields = z.infer<z.ZodObject<typeof addressFields>>;

/** Postal codes are checked where the format is known, and kept as entered elsewhere. */
function normalisePostalCode<T extends AddressFields>(address: T, ctx: z.RefinementCtx): T {
  if (!FIVE_DIGIT_POSTAL_CODE_COUNTRIES.has(address.country)) {
    if (!/^[A-Z0-9][A-Z0-9 -]{1,9}$/i.test(address.zipCode)) {
      ctx.addIssue({ code: 'custom', path: ['zipCode'], message: 'Enter a valid postal code.' });
    }
    return address;
  }

  const zipCode = zipCodeSchema.safeParse(address.zipCode);
  if (!zipCode.success) {
    ctx.addIssue({ code: 'custom', path: ['zipCode'], message: 'Enter a zip code like 031 01.' });
    return address;
  }

  return { ...address, zipCode: zipCode.data };
}

/** Where post for the customer goes. It is addressed to the account's name. */
export const mailingAddressSchema = z.object(addressFields).transform(normalisePostalCode);

/** Who invoices are made out to and where they go: the customer, or a company with its numbers. */
export const invoiceAddressSchema = z
  .object({
    recipient: text,
    companyId: optionalCode(/^[0-9A-Z]{6,20}$/, 'Enter a company number like 12345678.'),
    vatId: optionalCode(/^[A-Z]{2}[0-9A-Z]{2,13}$/, 'Enter a VAT number like SK2020123456.'),
    ...addressFields,
  })
  .transform(normalisePostalCode);

export const addressSaveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('MAILING'), address: mailingAddressSchema }),
  z.object({ kind: z.literal('INVOICE'), address: invoiceAddressSchema }),
]);

export const addressRemoveSchema = z.object({ kind: z.enum(ADDRESS_KINDS) });

export type MailingAddressInput = z.input<typeof mailingAddressSchema>;
export type InvoiceAddressInput = z.input<typeof invoiceAddressSchema>;
export type AddressSaveInput = z.input<typeof addressSaveSchema>;
