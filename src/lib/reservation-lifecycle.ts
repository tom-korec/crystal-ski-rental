import { addUtcDays } from '~/lib/date';

// The reservation lifecycle (BR-10…15). Routers enforce these transitions; screens use the same
// functions to decide which actions to offer. Dates are UTC-midnight `Date`s, `endDate` exclusive.

export const RESERVATION_STATUSES = [
  'CREATED',
  'ACTIVE',
  'RETURNED',
  'CANCELLED_BY_USER',
  'CANCELLED_BY_STORE',
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that occupy the ski for their dates. Must match the `reservation_no_overlap` constraint. */
export const DATE_HOLDING_STATUSES = ['CREATED', 'ACTIVE'] as const satisfies readonly ReservationStatus[];

export interface LifecycleReservation {
  status: ReservationStatus;
  startDate: Date;
  endDate: Date;
}

/** The customer, before the first day (BR-11). */
export function canCancelAsUser(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'CREATED' && reservation.startDate > today;
}

/** Staff, any time before pickup. This is also how a no-show is recorded. */
export function canCancelAsStore(reservation: LifecycleReservation): boolean {
  return reservation.status === 'CREATED';
}

/** Staff, on a day within the rental period. */
export function canPickUp(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'CREATED' && reservation.startDate <= today && today < reservation.endDate;
}

/** Staff, any day, including early and late returns. */
export function canReturn(reservation: LifecycleReservation): boolean {
  return reservation.status === 'ACTIVE';
}

export function isPickupDueToday(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'CREATED' && reservation.startDate.getTime() === today.getTime();
}

/** The first day has passed and the skis were not collected. */
export function isOverduePickup(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'CREATED' && reservation.startDate < today;
}

/** Today is the last day of the rental. */
export function isReturnDueToday(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'ACTIVE' && addUtcDays(reservation.endDate, -1).getTime() === today.getTime();
}

/** The last day has passed and the skis are not back. */
export function isOverdueReturn(reservation: LifecycleReservation, today: Date): boolean {
  return reservation.status === 'ACTIVE' && reservation.endDate <= today;
}
