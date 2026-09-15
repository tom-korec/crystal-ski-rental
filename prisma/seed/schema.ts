import { z } from 'zod';

import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '../../src/lib/catalog';
import { openingHoursSchema, specialDaySchema } from '../../src/lib/opening-hours';
import { RESERVATION_STATUSES } from '../../src/lib/reservation-lifecycle';
import { MOMENT_PATTERN } from './time';

// The shape of every file in `data/`. Files are checked on load, so a hand edit that breaks one fails
// the seed with the file and the field instead of a database error halfway through.

const moment = z.string().regex(MOMENT_PATTERN, 'Use "<day offset> HH:MM" or "<minutes>m".');
const dayOffset = z.number().int();

export const storeFileSchema = z.array(
  z.object({
    slug: z.string(),
    name: z.string(),
    street: z.string(),
    houseNumber: z.string(),
    city: z.string(),
    zipCode: z.string(),
    phone: z.string(),
    email: z.email(),
    /** Monday first, as intervals like "8:00-12:00;13:00-20:00"; null means closed. */
    openingHours: z.array(openingHoursSchema).length(7),
    createdAt: moment,
  }),
);

/** Special days every store keeps: public holidays with short hours, and Christmas closures. Real dates. */
export const specialDayFileSchema = z.array(specialDaySchema);

export const brandFileSchema = z.array(z.object({ name: z.string(), createdAt: moment }));

export const modelFileSchema = z.array(
  z.object({
    brand: z.string(),
    name: z.string(),
    type: z.enum(SKI_TYPES),
    gender: z.enum(SKI_GENDERS),
    skillLevel: z.enum(SKILL_LEVELS),
    pricePerDay: z.string(),
    createdAt: moment,
  }),
);

export const staffFileSchema = z.array(
  z.object({
    name: z.string(),
    email: z.email(),
    password: z.string(),
    role: z.enum(['ADMIN', 'MANAGER']),
    /** A manager's own store, by slug. */
    store: z.string().optional(),
    createdAt: moment,
  }),
);

const address = z.object({
  street: z.string(),
  houseNumber: z.string(),
  city: z.string(),
  zipCode: z.string(),
  country: z.string(),
});

export const customerFileSchema = z.array(
  z.object({
    name: z.string(),
    email: z.email(),
    password: z.string(),
    createdAt: moment,
    removedAt: moment.optional(),
    mailing: address.optional(),
    invoice: address
      .extend({ recipient: z.string(), companyId: z.string().optional(), vatId: z.string().optional() })
      .optional(),
  }),
);

export const skiFileSchema = z.array(
  z.object({
    code: z.string(),
    /** "Brand Model", as in models.json. */
    model: z.string(),
    lengthCm: z.number().int(),
    /** Taken out of rental. */
    outOfRental: z.boolean().optional(),
    removedAt: moment.optional(),
    createdAt: moment,
  }),
);

const byStaff = z.object({ at: moment, by: z.email() });

export const reservationFileSchema = z.array(
  z.object({
    code: z.string(),
    customer: z.email(),
    /** Inventory codes, all from the store the file is named after. */
    skis: z.array(z.string()).min(1),
    /** Day offsets; `end` is exclusive, like the stored end date. */
    start: dayOffset,
    end: dayOffset,
    status: z.enum(RESERVATION_STATUSES),
    createdAt: moment,
    pickedUp: byStaff.optional(),
    returned: byStaff.optional(),
    /** By the customer themselves, or by staff for a no-show. */
    cancelled: byStaff.optional(),
    note: z.string().optional(),
    rating: z.object({ score: z.number().int(), note: z.string().optional(), at: moment }).optional(),
    /** Model ratings written through this reservation, which opened their edit window at `at`. */
    modelRatings: z
      .array(z.object({ model: z.string(), score: z.number().int(), comment: z.string().optional(), at: moment }))
      .optional(),
  }),
);

export type StoreFile = z.infer<typeof storeFileSchema>;
export type BrandFile = z.infer<typeof brandFileSchema>;
export type ModelFile = z.infer<typeof modelFileSchema>;
export type StaffFile = z.infer<typeof staffFileSchema>;
export type CustomerFile = z.infer<typeof customerFileSchema>;
export type SkiFile = z.infer<typeof skiFileSchema>;
export type ReservationFile = z.infer<typeof reservationFileSchema>;
