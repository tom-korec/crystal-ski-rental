import { describe, expect, it } from 'vitest';

import { gendersMatching, SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';

import { SkiGender, SkillLevel, SkiType } from '../../generated/prisma/enums';

describe('catalogue enums', () => {
  it('match the database', () => {
    expect([...SKI_TYPES]).toEqual(Object.values(SkiType));
    expect([...SKI_GENDERS]).toEqual(Object.values(SkiGender));
    expect([...SKILL_LEVELS]).toEqual(Object.values(SkillLevel));
  });
});

describe('gendersMatching', () => {
  it('finds unisex skis for men and for women', () => {
    expect(gendersMatching('MAN')).toEqual(['MAN', 'UNISEX']);
    expect(gendersMatching('WOMAN')).toEqual(['WOMAN', 'UNISEX']);
  });

  it('finds only kids skis for kids', () => {
    expect(gendersMatching('KID')).toEqual(['KID']);
  });
});
