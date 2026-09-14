// Mirrors of the Prisma catalogue enums without importing server code, so forms and filters can use them.

export const SKI_TYPES = ['PISTE', 'ALL_MOUNTAIN', 'FREERIDE', 'FREESTYLE'] as const;
export type SkiType = (typeof SKI_TYPES)[number];

export const SKI_GENDERS = ['MAN', 'WOMAN', 'KID', 'UNISEX'] as const;
export type SkiGender = (typeof SKI_GENDERS)[number];

export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
