import { z } from 'zod';

import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import { moneySchema } from '~/lib/money';
import { cursorSchema } from '~/lib/pagination';
import { MAX_SCORE, MIN_SCORE } from '~/lib/rating-rules';
import { dateRangeSchema, refineRentalRange } from '~/lib/rental-range';

export const MIN_LENGTH_CM = 70;
export const MAX_LENGTH_CM = 210;
export const INVENTORY_CODE_MAX_LENGTH = 20;

/** Printed on a sticker, so kept short and unambiguous. Stored upper-case. */
export const inventoryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,20}$/, 'Use letters, digits and dashes, like SK-0142.');

export const lengthCmSchema = z.number().int().min(MIN_LENGTH_CM).max(MAX_LENGTH_CM);

export const skiCreateSchema = z.object({
  inventoryCode: inventoryCodeSchema,
  modelId: z.uuid(),
  storeId: z.uuid(),
  lengthCm: lengthCmSchema,
  isAvailable: z.boolean().default(true),
});

/**
 * Model and length are fixed: a different length is a different ski (FR-22). Optional fields mean
 * "fields this request changes", so the availability toggle can send `{ id, isAvailable }` alone.
 */
export const skiUpdateSchema = z.object({
  id: z.uuid(),
  inventoryCode: inventoryCodeSchema.optional(),
  storeId: z.uuid().optional(),
  isAvailable: z.boolean().optional(),
});

/** The edit form always submits every field it shows. */
export const skiEditSchema = skiUpdateSchema.required();

const catalogueFilters = {
  brandId: z.uuid().optional(),
  modelId: z.uuid().optional(),
  storeId: z.uuid().optional(),
  type: z.enum(SKI_TYPES).optional(),
  gender: z.enum(SKI_GENDERS).optional(),
  skillLevel: z.enum(SKILL_LEVELS).optional(),
  minLengthCm: lengthCmSchema.optional(),
  maxLengthCm: lengthCmSchema.optional(),
};

/** The staff fleet (FR-20). */
export const skiListSchema = z
  .object({
    ...catalogueFilters,
    inventoryCode: z.string().trim().max(INVENTORY_CODE_MAX_LENGTH).optional(),
    cursor: cursorSchema,
  })
  .prefault({});

export const SKI_SORTS = ['rating', 'priceAsc', 'priceDesc'] as const;
export type SkiSort = (typeof SKI_SORTS)[number];

/** The customer search (FR-30, FR-31). Dates are required: availability only means something for a period. */
export const skiSearchSchema = dateRangeSchema
  .extend({
    ...catalogueFilters,
    maxPricePerDay: moneySchema.optional(),
    minRating: z.number().int().min(MIN_SCORE).max(MAX_SCORE).optional(),
    sort: z.enum(SKI_SORTS).default('rating'),
    cursor: cursorSchema,
  })
  .superRefine(refineRentalRange);

export type SkiCreateInput = z.infer<typeof skiCreateSchema>;
export type SkiUpdateInput = z.infer<typeof skiUpdateSchema>;
export type SkiListInput = z.infer<typeof skiListSchema>;
export type SkiSearchInput = z.input<typeof skiSearchSchema>;
