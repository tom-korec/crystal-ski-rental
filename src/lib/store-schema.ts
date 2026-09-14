import { z } from 'zod';

export const STORE_TEXT_MAX_LENGTH = 100;
export const OPENING_HOURS_MAX_LENGTH = 50;

/** The seven free-text opening-hours fields, Monday first. An empty string means closed (FR-12). */
export const OPENING_HOURS_FIELDS = [
  'openingHoursMonday',
  'openingHoursTuesday',
  'openingHoursWednesday',
  'openingHoursThursday',
  'openingHoursFriday',
  'openingHoursSaturday',
  'openingHoursSunday',
] as const;

export type OpeningHoursField = (typeof OPENING_HOURS_FIELDS)[number];

const text = z.string().trim().min(1).max(STORE_TEXT_MAX_LENGTH);

/** Slovak postal code, entered as "031 01" or "03101", stored without the space. */
export const zipCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{3} ?\d{2}$/, 'Enter a zip code like 031 01.')
  .transform((value) => value.replace(' ', ''));

/** International format. Spaces are allowed while typing and removed before saving. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter a phone number with the country code, like +421 903 123 456.'));

const openingHoursSchema = z.string().trim().max(OPENING_HOURS_MAX_LENGTH);

const storeFields = {
  name: text,
  street: text,
  houseNumber: z.string().trim().min(1).max(20),
  city: text,
  zipCode: zipCodeSchema,
  phone: phoneSchema,
  email: z.email(),
  openingHoursMonday: openingHoursSchema,
  openingHoursTuesday: openingHoursSchema,
  openingHoursWednesday: openingHoursSchema,
  openingHoursThursday: openingHoursSchema,
  openingHoursFriday: openingHoursSchema,
  openingHoursSaturday: openingHoursSchema,
  openingHoursSunday: openingHoursSchema,
} satisfies Record<OpeningHoursField, typeof openingHoursSchema> & Record<string, z.ZodType>;

export const storeCreateSchema = z.object(storeFields);

export const storeUpdateSchema = z.object({ id: z.uuid(), ...storeFields });

export type StoreCreateInput = z.input<typeof storeCreateSchema>;
export type StoreUpdateInput = z.input<typeof storeUpdateSchema>;
