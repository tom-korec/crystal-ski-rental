import { type StoreHours } from '~/lib/opening-hours';

import type { PrismaClient } from '../../../generated/prisma/client';
import { storeSelect, withPlainSpecialDays } from './selects';

/** A store with its hours and special days, as the booking rules read them (BR-7). */
export async function storeWithHours(db: PrismaClient, storeId: string) {
  const store = await db.store.findUnique({ where: { id: storeId }, select: storeSelect });
  return store ? withPlainSpecialDays(store) : null;
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "Jasná is closed on 25 December 2026 (Christmas Day)." for an API error. */
export function closedMessage(
  store: { name: string },
  days: { date: string; special: { name: string | null } | null }[],
): string {
  const dates = days.map(
    (day) => `${DAY.format(new Date(`${day.date}T00:00:00Z`))}${day.special?.name ? ` (${day.special.name})` : ''}`,
  );
  return `${store.name} is closed on ${dates.join(' and ')}, so skis cannot be picked up or returned then. Pick other dates.`;
}

export type { StoreHours };
