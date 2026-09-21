import { z } from 'zod';

export const idSchema = z.object({ id: z.uuid() });

export type IdInput = z.infer<typeof idSchema>;
