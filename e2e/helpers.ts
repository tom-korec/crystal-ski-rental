import { expect, type Page } from '@playwright/test';

import { rentalDays, type StoreHours } from '../src/lib/opening-hours';

/** The accounts `prisma/seed` creates. */
export const ACCOUNTS = {
  admin: { email: 'admin@crystalskirental.test', password: 'Admin123!', home: '/staff' },
  manager: { email: 'manager@crystalskirental.test', password: 'Manager123!', home: '/staff' },
  customer: { email: 'customer@crystalskirental.test', password: 'Customer123!', home: '/app' },
} as const;

export async function signIn(page: Page, account: keyof typeof ACCOUNTS) {
  const { email, password, home } = ACCOUNTS[account];

  await page.goto('/sign-in');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByTestId('signin-submit').click();
  await expect(page).toHaveURL(new RegExp(`${home}$`));
}

/** `YYYY-MM-DD`, `days` from today in UTC, as the app stores dates. */
export function dayFromToday(days: number): string {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}

interface StoreWithHours extends StoreHours {
  id: string;
  name: string;
}

/**
 * A store and dates from `days` ahead, moved later as needed so pickup and return fall on ordinary open
 * days: the seed's closed weekdays and holidays depend on the day the suite runs.
 */
export async function openStoreDates(page: Page, storeName: string, days: number, length: number) {
  const stores = await page.request
    .get('/api/trpc/store.list')
    .then((response) => response.json() as Promise<{ result: { data: { json: StoreWithHours[] } } }>)
    .then((body) => body.result.data.json);
  const store = stores.find((candidate) => candidate.name === storeName);
  if (!store) throw new Error(`No store named ${storeName}`);

  for (let offset = days; offset < days + 30; offset++) {
    const range = { startDate: dayFromToday(offset), endDate: dayFromToday(offset + length) };
    const rental = rentalDays(store, range);
    if ([rental.pickup, rental.return].every((day) => day.hours !== null && day.special === null)) {
      return { store, from: range.startDate, to: range.endDate };
    }
  }
  throw new Error(`${storeName} has no open dates around ${days} days from now`);
}
