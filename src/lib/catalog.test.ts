import { describe, expect, it } from 'vitest';

import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';

import { SkiGender, SkillLevel, SkiType } from '../../generated/prisma/enums';

describe('catalogue enums', () => {
  it('match the database', () => {
    expect([...SKI_TYPES]).toEqual(Object.values(SkiType));
    expect([...SKI_GENDERS]).toEqual(Object.values(SkiGender));
    expect([...SKILL_LEVELS]).toEqual(Object.values(SkillLevel));
  });
});
