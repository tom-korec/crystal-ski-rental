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

/** A customer's address as the customer and staff see it (FR-6). */
export const customerAddressSelect = {
  kind: true,
  recipient: true,
  companyId: true,
  vatId: true,
  street: true,
  houseNumber: true,
  city: true,
  zipCode: true,
  country: true,
  updatedAt: true,
} satisfies Prisma.CustomerAddressSelect;

/** A ski as customers see it: never its inventory code (BR-50). */
export const skiPublicSelect = {
  id: true,
  lengthCm: true,
  model: { select: skiModelSelect },
  store: { select: { id: true, name: true, city: true } },
} satisfies Prisma.SkiSelect;

/** Decimal columns leave the API as plain values. */
export function withPlainModel<T extends { model: Parameters<typeof plainSkiModel>[0] }>(row: T) {
  return { ...row, model: plainSkiModel(row.model) };
}
