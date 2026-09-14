// Mirrors of the Prisma catalogue enums without importing server code, so forms and filters can use them.

export const SKI_TYPES = ['PISTE', 'ALL_MOUNTAIN', 'FREERIDE', 'FREESTYLE'] as const;
export type SkiType = (typeof SKI_TYPES)[number];

export const SKI_GENDERS = ['MAN', 'WOMAN', 'KID', 'UNISEX'] as const;
export type SkiGender = (typeof SKI_GENDERS)[number];

/** What a customer filters by. Unisex skis are not a choice of their own: they suit men and women alike. */
export const GENDER_FILTERS = ['MAN', 'WOMAN', 'KID'] as const satisfies readonly SkiGender[];
export type GenderFilter = (typeof GENDER_FILTERS)[number];

/** The model genders a gender filter finds. */
export function gendersMatching(filter: GenderFilter): SkiGender[] {
  return filter === 'KID' ? ['KID'] : [filter, 'UNISEX'];
}

export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
