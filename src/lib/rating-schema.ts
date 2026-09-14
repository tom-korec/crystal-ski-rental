import { z } from 'zod';

import { pageSchema } from '~/lib/pagination';
import { MAX_SCORE, MIN_SCORE, RATING_TEXT_MAX_LENGTH } from '~/lib/rating-rules';

const scoreSchema = z.number().int().min(MIN_SCORE).max(MAX_SCORE);

/** Optional free text: blank means none. */
const ratingTextSchema = z
  .string()
  .trim()
  .max(RATING_TEXT_MAX_LENGTH)
  .transform((value) => value || null)
  .nullish();

/** Rate the rental experience of one returned reservation (FR-42). */
export const reservationRatingUpsertSchema = z.object({
  reservationId: z.uuid(),
  score: scoreSchema,
  note: ratingTextSchema,
});

/** Rate the ski model, through a returned reservation of that model (FR-43). */
export const modelRatingUpsertSchema = z.object({
  reservationId: z.uuid(),
  score: scoreSchema,
  comment: ratingTextSchema,
});

export const modelRatingsSchema = z.object({ modelId: z.uuid(), page: pageSchema });

export type ReservationRatingUpsertInput = z.input<typeof reservationRatingUpsertSchema>;
export type ModelRatingUpsertInput = z.input<typeof modelRatingUpsertSchema>;
