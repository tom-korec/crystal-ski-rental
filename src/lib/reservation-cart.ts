import { z } from 'zod';

import { type DateRange, rentalRangeSchema } from '~/lib/rental-range';
import { MAX_SKIS_PER_RESERVATION } from '~/lib/reservation-schema';

// The reservation a customer is putting together before booking it (FR-33): skis added one at a time
// from the search, all from one store and for the same days (BR-6). It lives in the browser until it is
// booked, so these rules only shape the screens; the booking itself is checked again by the server.

export const reservationCartSchema = z.object({
  storeId: z.uuid(),
  startDate: z.string(),
  endDate: z.string(),
  skiIds: z.array(z.uuid()).min(1).max(MAX_SKIS_PER_RESERVATION),
});

export type ReservationCart = z.infer<typeof reservationCartSchema>;

export interface CartSki {
  id: string;
  storeId: string;
}

export type AddToCartOutcome =
  | { kind: 'added'; cart: ReservationCart }
  | { kind: 'alreadyAdded' }
  /** The cart is for other dates or another store: the ski can only start a new cart. */
  | { kind: 'otherDates' | 'otherStore'; cart: ReservationCart }
  | { kind: 'full' };

export function startCart(ski: CartSki, range: DateRange): ReservationCart {
  return { storeId: ski.storeId, startDate: range.startDate, endDate: range.endDate, skiIds: [ski.id] };
}

export function addToCart(cart: ReservationCart | null, ski: CartSki, range: DateRange): AddToCartOutcome {
  if (!cart) return { kind: 'added', cart: startCart(ski, range) };

  if (cart.startDate !== range.startDate || cart.endDate !== range.endDate) return { kind: 'otherDates', cart };
  if (cart.storeId !== ski.storeId) return { kind: 'otherStore', cart };
  if (cart.skiIds.includes(ski.id)) return { kind: 'alreadyAdded' };
  if (cart.skiIds.length >= MAX_SKIS_PER_RESERVATION) return { kind: 'full' };

  return { kind: 'added', cart: { ...cart, skiIds: [...cart.skiIds, ski.id] } };
}

/** An emptied cart is no cart at all. */
export function removeFromCart(cart: ReservationCart, skiId: string): ReservationCart | null {
  const skiIds = cart.skiIds.filter((id) => id !== skiId);
  return skiIds.length > 0 ? { ...cart, skiIds } : null;
}

/**
 * A stored cart, or null when there is none or it can no longer be booked: unreadable, or for dates that
 * have started meanwhile. Reading "today" from the browser is fine here; the server has the last word.
 */
export function parseCart(value: unknown): ReservationCart | null {
  const cart = reservationCartSchema.safeParse(value);
  if (!cart.success) return null;

  return rentalRangeSchema.safeParse(cart.data).success ? cart.data : null;
}
