import { z } from 'zod';

export const BRAND_NAME_MAX_LENGTH = 60;

const brandNameSchema = z.string().trim().min(1).max(BRAND_NAME_MAX_LENGTH);

export const brandCreateSchema = z.object({ name: brandNameSchema });

export const brandUpdateSchema = z.object({ id: z.uuid(), name: brandNameSchema });

export type BrandCreateInput = z.infer<typeof brandCreateSchema>;
export type BrandUpdateInput = z.infer<typeof brandUpdateSchema>;
