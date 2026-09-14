import { expect, type Page } from '@playwright/test';

/** The accounts `prisma/seed` creates. */
export const ACCOUNTS = {
  admin: { email: 'admin@crystalskirental.test', password: 'Admin123!', home: '/staff' },
  manager: { email: 'manager@crystalskirental.test', password: 'Manager123!', home: '/staff' },
  customer: { email: 'customer@crystalskirental.test', password: 'Customer123!', home: '/app' },
} as const;

export async function signIn(page: Page, account: keyof typeof ACCOUNTS) {
  const { email, password, home } = ACCOUNTS[account];

  await page.goto('/');
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
