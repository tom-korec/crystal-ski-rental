import { z } from 'zod';

import { pageSchema } from '~/lib/pagination';
import { dateRangeSchema, refineRentalRange } from '~/lib/rental-range';

/** A family's skis fit comfortably; more than this is a group booking the store arranges itself (BR-6). */
export const MAX_SKIS_PER_RESERVATION = 8;

/** One or more skis, all from one store, for the same days (FR-33, BR-6). The store is checked by the server. */
export const reservationCreateSchema = dateRangeSchema
  .extend({
    skiIds: z
      .array(z.uuid())
      .min(1, 'Choose at least one pair of skis.')
      .max(MAX_SKIS_PER_RESERVATION, `One reservation holds up to ${MAX_SKIS_PER_RESERVATION} pairs of skis.`)
      .refine((ids) => new Set(ids).size === ids.length, 'Each pair of skis can be added only once.'),
  })
  .superRefine(refineRentalRange);

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;

export const reservationIdSchema = z.object({ id: z.uuid() });

// Reservation histories are page-numbered tables. `prefault`, not `default`, so `page` gets its own default.
export const myReservationsSchema = z.object({ page: pageSchema }).prefault({});

export const reservationsBySkiSchema = z.object({ skiId: z.uuid(), page: pageSchema });

export const reservationsByUserSchema = z.object({ userId: z.string().min(1), page: pageSchema });

export const frontDeskSchema = z.object({ storeId: z.uuid() });
