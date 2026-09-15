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

/**
 * Rate a returned reservation: the rental experience (FR-42) and each ski model in it (FR-43), sent
 * together. A part may be missing when it cannot be written any more, but not everything.
 */
export const ratingSchema = z
  .object({
    reservationId: z.uuid(),
    rental: z.object({ score: scoreSchema, note: ratingTextSchema }).optional(),
    models: z
      .array(z.object({ modelId: z.uuid(), score: scoreSchema, comment: ratingTextSchema }))
      .refine((models) => new Set(models.map((model) => model.modelId)).size === models.length, 'Rate each model once.')
      .default([]),
  })
  .refine((input) => Boolean(input.rental) || input.models.length > 0, { message: 'Rate the rental or the skis.' });

export const modelRatingsSchema = z.object({ modelId: z.uuid(), page: pageSchema });

export type RatingInput = z.infer<typeof ratingSchema>;
