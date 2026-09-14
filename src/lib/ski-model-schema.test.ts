import { describe, expect, it } from 'vitest';

import { skiModelCreateSchema } from '~/lib/ski-model-schema';

const model = {
  brandId: '01a0a078-c06c-72cd-980e-03fd4d0fe746',
  name: 'Redster G9',
  type: 'PISTE',
  gender: 'UNISEX',
  skillLevel: 'EXPERT',
};

describe('skiModelCreateSchema price', () => {
  it.each(['38', '38.5', '0.01'])('accepts %s', (pricePerDay) => {
    expect(skiModelCreateSchema.safeParse({ ...model, pricePerDay }).success).toBe(true);
  });

  it.each(['0', '0.00', '-5', '38.505', 'abc', ''])('refuses %j without throwing', (pricePerDay) => {
    expect(() => skiModelCreateSchema.safeParse({ ...model, pricePerDay })).not.toThrow();
    expect(skiModelCreateSchema.safeParse({ ...model, pricePerDay }).success).toBe(false);
  });
});
