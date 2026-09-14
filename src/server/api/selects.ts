import { toMoneyString } from '~/lib/money';

import type { Prisma } from '../../../generated/prisma/client';

// Shapes shared by several routers, so the client gets one type per entity.

/** Everything a customer needs to find and contact a store (FR-12, FR-33). */
export const storeSelect = {
  id: true,
  name: true,
  street: true,
  houseNumber: true,
  city: true,
  zipCode: true,
  phone: true,
  email: true,
  openingHoursMonday: true,
  openingHoursTuesday: true,
  openingHoursWednesday: true,
  openingHoursThursday: true,
  openingHoursFriday: true,
  openingHoursSaturday: true,
  openingHoursSunday: true,
} satisfies Prisma.StoreSelect;

export const skiModelSelect = {
  id: true,
  name: true,
  type: true,
  gender: true,
  skillLevel: true,
  pricePerDay: true,
  avgRating: true,
  ratingCount: true,
  brand: { select: { id: true, name: true } },
} satisfies Prisma.SkiModelSelect;

type DecimalLike = { toString(): string; toNumber(): number };

/** Money leaves the API as a decimal string; the rating average is display-only, so a number is fine. */
export function plainSkiModel<T extends { pricePerDay: DecimalLike; avgRating: DecimalLike | null }>(model: T) {
  return {
    ...model,
    pricePerDay: toMoneyString(model.pricePerDay),
    avgRating: model.avgRating === null ? null : model.avgRating.toNumber(),
  };
}
