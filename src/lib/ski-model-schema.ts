import { z } from 'zod';

import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import { isPositiveMoney, moneySchema } from '~/lib/money';

export const SKI_MODEL_NAME_MAX_LENGTH = 80;

const skiModelFields = {
  brandId: z.uuid(),
  name: z.string().trim().min(1).max(SKI_MODEL_NAME_MAX_LENGTH),
  type: z.enum(SKI_TYPES),
  gender: z.enum(SKI_GENDERS),
  skillLevel: z.enum(SKILL_LEVELS),
  pricePerDay: moneySchema.refine(isPositiveMoney, 'The price must be more than zero.'),
};

export const skiModelCreateSchema = z.object(skiModelFields);

export const skiModelUpdateSchema = z.object({ id: z.uuid(), ...skiModelFields });

export const skiModelListSchema = z.object({ brandId: z.uuid().optional() }).prefault({});

export type SkiModelCreateInput = z.infer<typeof skiModelCreateSchema>;
export type SkiModelUpdateInput = z.infer<typeof skiModelUpdateSchema>;
