'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { parseCart, type ReservationCart } from '~/lib/reservation-cart';
import { api } from '~/trpc/react';

// The cart lives in localStorage, one per account, so it survives a reload and a second tab sees the
// same one. It is a convenience: nothing breaks when storage is unavailable, the cart just starts empty.

const CHANGE_EVENT = 'reservation-cart-change';

function storageKey(userId: string): string {
  return `crystal-ski-rental:reservation-cart:${userId}`;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string | null): string | null {
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, cart: ReservationCart | null): void {
  try {
    if (cart) window.localStorage.setItem(key, JSON.stringify(cart));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage refused (private mode, quota): the cart simply does not persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** The signed-in customer's reservation cart, and a way to replace it (null empties it). */
export function useReservationCart() {
  const session = api.auth.session.useQuery();
  const key = session.data ? storageKey(session.data.id) : null;

  // The raw string is the snapshot: it compares by value, so an unchanged cart does not re-render.
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const cart = useMemo(() => {
    if (raw === null) return null;
    try {
      return parseCart(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [raw]);

  const setCart = useCallback((next: ReservationCart | null) => key && write(key, next), [key]);

  return { cart, setCart, isReady: session.isSuccess };
}
