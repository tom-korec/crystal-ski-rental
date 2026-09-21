import { toMoneyString } from '~/lib/money';

import type { Prisma } from '../../../generated/prisma/client';

// The shapes a reservation is read in, shared by the service's queries. A customer's shape never
// carries inventory codes or other people's identities (BR-50).

export const reservationFields = {
  id: true,
  code: true,
  startDate: true,
  endDate: true,
  status: true,
  rentalDays: true,
  discountPercent: true,
  totalPrice: true,
  note: true,
  createdAt: true,
  pickedUpAt: true,
  returnedAt: true,
  cancelledAt: true,
} satisfies Prisma.ReservationSelect;

export const skiModelSummary = { select: { id: true, name: true, brand: { select: { name: true } } } } as const;

export const rentalRatingSelect = { select: { score: true, note: true, createdAt: true } } as const;

/** Items in a stable order: by model, then length, so the same reservation always reads the same. */
export const ITEM_ORDER = [
  { ski: { model: { name: 'asc' } } },
  { ski: { lengthCm: 'asc' } },
  { id: 'asc' },
] satisfies Prisma.ReservationItemOrderByWithRelationInput[];

/** A customer's own reservation: never the inventory codes (FR-40, BR-50). */
export const customerReservationSelect = {
  ...reservationFields,
  store: { select: { id: true, name: true } },
  addresses: {
    select: {
      kind: true,
      recipient: true,
      companyId: true,
      vatId: true,
      street: true,
      houseNumber: true,
      city: true,
      zipCode: true,
      country: true,
    },
    orderBy: { kind: 'asc' },
  },
  items: {
    select: {
      id: true,
      pricePerDay: true,
      totalPrice: true,
      ski: { select: { id: true, lengthCm: true, model: skiModelSummary } },
    },
    orderBy: ITEM_ORDER,
  },
  rating: rentalRatingSelect,
} satisfies Prisma.ReservationSelect;

export const staffReservationSelect = {
  ...reservationFields,
  store: { select: { id: true, name: true, city: true } },
  items: {
    select: {
      id: true,
      pricePerDay: true,
      totalPrice: true,
      ski: { select: { id: true, inventoryCode: true, lengthCm: true, deletedAt: true, model: skiModelSummary } },
    },
    orderBy: ITEM_ORDER,
  },
  user: { select: { id: true, name: true, email: true, deletedAt: true } },
  pickedUpBy: { select: { id: true, name: true } },
  returnedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
  rating: rentalRatingSelect,
} satisfies Prisma.ReservationSelect;

type Priced = { toString(): string };
type PricedItem = { pricePerDay: Priced; totalPrice: Priced };
type PlainItem<I extends PricedItem> = Omit<I, 'pricePerDay' | 'totalPrice'> & {
  pricePerDay: string;
  totalPrice: string;
};

/** Everything staff need about one reservation: who, what, where, how much, and who did what when (FR-66). */
export const staffReservationDetailSelect = {
  ...staffReservationSelect,
  rentalAgreementVersion: true,
  rentalAgreementAcceptedAt: true,
  addresses: {
    select: {
      kind: true,
      recipient: true,
      companyId: true,
      vatId: true,
      street: true,
      houseNumber: true,
      city: true,
      zipCode: true,
      country: true,
    },
    orderBy: { kind: 'asc' },
  },
} satisfies Prisma.ReservationSelect;

/** Decimal columns leave the API as plain strings. */
export function withPlainPrices<T extends { totalPrice: Priced; items: PricedItem[] }>(
  row: T,
): Omit<T, 'totalPrice' | 'items'> & { totalPrice: string; items: PlainItem<T['items'][number]>[] } {
  return {
    ...row,
    totalPrice: toMoneyString(row.totalPrice),
    items: row.items.map((item: T['items'][number]): PlainItem<T['items'][number]> => ({
      ...item,
      pricePerDay: toMoneyString(item.pricePerDay),
      totalPrice: toMoneyString(item.totalPrice),
    })),
  };
}

/** Newest first, tie-broken by id so a page boundary cannot repeat or skip a row. */
export const HISTORY_ORDER = [
  { startDate: 'desc' },
  { id: 'asc' },
] satisfies Prisma.ReservationOrderByWithRelationInput[];
