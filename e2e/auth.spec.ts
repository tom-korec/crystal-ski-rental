import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

test.describe('signing in and access by role', () => {
  test('a wrong password is refused with a message', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('E-mail').fill('customer@crystalskirental.test');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByTestId('signin-submit').click();

    await expect(page.getByTestId('auth-error')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL('/');
  });

  test('a customer lands on ski search and is kept out of the staff area', async ({ page }) => {
    await signIn(page, 'customer');
    await expect(page.getByTestId('page-title')).toHaveText('Find skis');

    await page.goto('/staff');
    await expect(page).toHaveURL('/app');

    await page.goto('/');
    await expect(page).toHaveURL('/app');
  });

  test('a manager lands on the front desk and cannot open the catalogue', async ({ page }) => {
    await signIn(page, 'manager');
    await expect(page.getByTestId('page-title')).toHaveText('Front desk');
    await expect(page.getByTestId('nav-catalog')).toHaveCount(0);

    await page.goto('/staff/catalog');
    await expect(page).toHaveURL('/staff');

    await page.goto('/app');
    await expect(page).toHaveURL('/staff');
  });

  test('signing out ends the session', async ({ page }) => {
    await signIn(page, 'admin');
    await page.getByTestId('sign-out').click();
    await expect(page).toHaveURL('/');

    await page.goto('/staff');
    await expect(page).toHaveURL('/');
  });

  test('a visitor can sign up and becomes a customer', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('auth-switch').click();
    await page.getByTestId('signup-submit').click();
    await expect(page.getByText('Enter your name.')).toBeVisible();

    await page.getByLabel('Name').fill('Nina Nová');
    await page.getByLabel('E-mail').fill(`nina.${Date.now()}@example.test`);
    await page.getByLabel('Password').fill('Nina12345!');
    await page.getByTestId('signup-submit').click();

    await expect(page).toHaveURL('/app');
    await expect(page.getByTestId('role-badge')).toHaveCount(0);
  });
});

test('the landing page fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
});
