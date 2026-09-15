import type { ReservationStatus } from '~/lib/reservation-lifecycle';

// Rating rules (BR-40…41). Both kinds need a returned reservation and are editable for one hour, judged
// by the server clock. Routers enforce these; screens use them to show "editable until" or "locked".

export const MIN_SCORE = 1;
export const MAX_SCORE = 5;
export const RATING_TEXT_MAX_LENGTH = 1000;
export const RATING_EDIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * - `create`: no rating yet.
 * - `edit`: the rating's edit window is open.
 * - `reopen`: model ratings only. A newer returned rental may change a locked rating, opening a new window.
 * - `locked`: the window has closed.
 * - `notEligible`: the reservation is not returned.
 */
export type RatingAccess = 'create' | 'edit' | 'reopen' | 'locked' | 'notEligible';

export function editWindowEndsAt(windowStartedAt: Date): Date {
  return new Date(windowStartedAt.getTime() + RATING_EDIT_WINDOW_MS);
}

export function isEditWindowOpen(windowStartedAt: Date, now: Date): boolean {
  return now < editWindowEndsAt(windowStartedAt);
}

export function canWriteRating(access: RatingAccess): boolean {
  return access === 'create' || access === 'edit' || access === 'reopen';
}

interface RatedReservation {
  id: string;
  status: ReservationStatus;
  returnedAt: Date | null;
}

/** One rental rating per reservation, editable for an hour after it was first submitted (BR-40). */
export function reservationRatingAccess(
  reservation: Pick<RatedReservation, 'status'>,
  rating: { createdAt: Date } | null,
  now: Date,
): RatingAccess {
  if (reservation.status !== 'RETURNED') return 'notEligible';
  if (!rating) return 'create';

  return isEditWindowOpen(rating.createdAt, now) ? 'edit' : 'locked';
}

/**
 * One model rating per customer per model, written through a returned reservation of that model (BR-41).
 * `reservation` is the one the customer is rating through; the caller has already checked it is theirs
 * and for a ski of this model.
 */
export function modelRatingAccess(
  reservation: RatedReservation,
  rating: { reservationId: string; windowStartedAt: Date } | null,
  now: Date,
): RatingAccess {
  if (reservation.status !== 'RETURNED' || !reservation.returnedAt) return 'notEligible';
  if (!rating) return 'create';

  if (rating.reservationId === reservation.id) {
    return isEditWindowOpen(rating.windowStartedAt, now) ? 'edit' : 'locked';
  }

  // Only a rental returned after the current window opened is a new experience of the model. An older
  // one must not be usable to reopen a rating it was never used for.
  return reservation.returnedAt > rating.windowStartedAt ? 'reopen' : 'locked';
}

export type RatingAction = 'rate' | 'edit';

/**
 * A reservation's rental and ski models are rated together, behind one button: "rate" while any rating
 * can still be written for the first time through this reservation, "edit" while an edit window is
 * open, and none once all are locked.
 */
export function ratingAction(rental: RatingAccess, models: readonly RatingAccess[]): RatingAction | null {
  if (rental === 'create' || models.some((model) => model === 'create' || model === 'reopen')) return 'rate';
  if (rental === 'edit' || models.includes('edit')) return 'edit';

  return null;
}
