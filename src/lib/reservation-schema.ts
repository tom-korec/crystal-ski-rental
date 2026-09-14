import { z } from 'zod';

import { pageSchema } from '~/lib/pagination';
import { dateRangeSchema, refineRentalRange } from '~/lib/rental-range';

export const reservationCreateSchema = dateRangeSchema.extend({ skiId: z.uuid() }).superRefine(refineRentalRange);

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;

export const reservationIdSchema = z.object({ id: z.uuid() });

// Reservation histories are page-numbered tables. `prefault`, not `default`, so `page` gets its own default.
export const myReservationsSchema = z.object({ page: pageSchema }).prefault({});

export const reservationsBySkiSchema = z.object({ skiId: z.uuid(), page: pageSchema });

export const reservationsByUserSchema = z.object({ userId: z.string().min(1), page: pageSchema });

export const frontDeskSchema = z.object({ storeId: z.uuid() });
