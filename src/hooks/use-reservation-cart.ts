'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { parseCart, type ReservationCart } from '~/lib/reservation-cart';
import { api } from '~/trpc/react';

// The cart lives in localStorage, one per account and one for a visitor who has not signed in, so it
// survives a reload and a second tab sees the same one. It is a convenience: nothing breaks when storage
// is unavailable, the cart just starts empty.

const CHANGE_EVENT = 'reservation-cart-change';
const GUEST = 'guest';
/** Set for the tab when a visitor's cart replaced the account's, until the customer has seen why. */
const REPLACED_NOTICE_KEY = 'crystal-ski-rental:reservation-cart-replaced';

function storageKey(owner: string): string {
  return `crystal-ski-rental:reservation-cart:${owner}`;
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

function toCart(raw: string | null): ReservationCart | null {
  if (raw === null) return null;
  try {
    return parseCart(JSON.parse(raw));
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

/** The reservation cart of whoever is browsing, signed in or not, and a way to replace it (null empties it). */
export function useReservationCart() {
  const session = api.auth.session.useQuery();
  const key = session.isSuccess ? storageKey(session.data?.id ?? GUEST) : null;

  // The raw string is the snapshot: it compares by value, so an unchanged cart does not re-render.
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const cart = useMemo(() => toCart(raw), [raw]);
  const setCart = useCallback((next: ReservationCart | null) => key && write(key, next), [key]);

  return { cart, setCart, isReady: session.isSuccess };
}

/**
 * Moves a visitor's cart onto the customer account they signed in to. The skis picked last win, so it
 * replaces a cart the account had from before, and the customer is told so on the next page.
 */
export function handOverGuestCart(userId: string): void {
  const guest = toCart(read(storageKey(GUEST)));
  if (!guest) return;

  const accountKey = storageKey(userId);
  const previous = read(accountKey);

  if (toCart(previous) !== null && previous !== JSON.stringify(guest)) {
    try {
      window.sessionStorage.setItem(REPLACED_NOTICE_KEY, '1');
    } catch {
      // Without storage the notice is skipped; the cart itself is what matters.
    }
  }

  write(accountKey, guest);
  write(storageKey(GUEST), null);
}

function readNotice(): boolean {
  try {
    return window.sessionStorage.getItem(REPLACED_NOTICE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Whether to tell the customer that their cart from before signing in replaced an older one. */
export function useCartReplacedNotice() {
  const shown = useSyncExternalStore(subscribe, readNotice, () => false);

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.removeItem(REPLACED_NOTICE_KEY);
    } catch {
      // Nothing stored, nothing to remove.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { shown, dismiss };
}
