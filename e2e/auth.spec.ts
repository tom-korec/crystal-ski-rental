import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

test.describe('signing in and access by role', () => {
  test('a wrong password is refused with a message', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByLabel('E-mail').fill('customer@crystalskirental.test');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByTestId('signin-submit').click();

    await expect(page.getByTestId('auth-error')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL('/sign-in');
  });

  test('a customer lands on ski search and is kept out of the staff area', async ({ page }) => {
    await signIn(page, 'customer');
    await expect(page.getByTestId('page-title')).toHaveText('Find skis');

    await page.goto('/staff');
    await expect(page).toHaveURL('/app');

    await page.goto('/');
    await expect(page).toHaveURL('/app');
  });

  test('a manager lands on the front desk, sees stores without editing them, and cannot open models', async ({
    page,
  }) => {
    await signIn(page, 'manager');
    await expect(page.getByTestId('page-title')).toHaveText('Front desk');
    await expect(page.getByTestId('nav-models')).toHaveCount(0);

    await page.getByTestId('nav-stores').click();
    await expect(page.getByTestId('store-details')).toBeVisible();
    await expect(page.getByTestId('edit-entry')).toHaveCount(0);
    await expect(page.getByTestId('add-store')).toHaveCount(0);

    await page.goto('/staff/models');
    await expect(page).toHaveURL('/staff');

    await page.goto('/app');
    await expect(page).toHaveURL('/staff');
  });

  test('signing out ends the session', async ({ page }) => {
    await signIn(page, 'admin');
    await page.getByTestId('account-menu').click();
    await expect(page.getByTestId('account-panel')).toContainText('Admin');
    await page.getByTestId('sign-out').click();
    await expect(page).toHaveURL('/');

    await page.goto('/staff');
    await expect(page).toHaveURL('/sign-in');
  });

  test('a visitor can sign up and becomes a customer', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('auth-switch').click();
    await page.getByTestId('signup-submit').click();
    await expect(page.getByText('Enter your name.')).toBeVisible();

    await page.getByLabel('Name').fill('Nina Nová');
    await page.getByLabel('E-mail').fill(`nina.${Date.now()}@example.test`);
    await page.getByLabel('Password').fill('Nina12345!');
    await page.getByTestId('signup-submit').click();
    await expect(page.getByText('Accept the terms and the privacy policy to create an account.')).toBeVisible();
    await page.getByTestId('signup-accept').check();
    await page.getByTestId('signup-submit').click();

    await expect(page).toHaveURL('/app');
    await expect(page.getByTestId('role-badge')).toHaveCount(0);
  });
});

test('a customer created by staff accepts the terms after signing in', async ({ page, browser }) => {
  await signIn(page, 'manager');
  await page.goto('/staff/accounts');
  await page.getByTestId('add-account').click();
  const dialog = page.getByTestId('account-dialog');
  const email = `walk.in.${Date.now()}@example.test`;
  await dialog.getByLabel('Name').fill('Walk In');
  await dialog.getByLabel('E-mail').fill(email);
  await dialog.getByLabel('Password').fill('Customer123!');
  await dialog.getByTestId('save-account').click();
  await expect(dialog).toBeHidden();

  const customer = await browser.newPage();
  await customer.goto('/sign-in');
  await customer.getByLabel('E-mail').fill(email);
  await customer.getByLabel('Password').fill('Customer123!');
  await customer.getByTestId('signin-submit').click();
  await expect(customer).toHaveURL('/accept-terms');

  // Every customer page sends them back until they accept.
  await customer.goto('/app/reservations');
  await expect(customer).toHaveURL('/accept-terms');

  await customer.getByTestId('accept-legal-submit').click();
  await expect(customer.getByText('Accept both documents to continue.')).toBeVisible();
  await customer.getByTestId('accept-legal').check();
  await customer.getByTestId('accept-legal-submit').click();
  await expect(customer).toHaveURL('/app');
  await customer.close();
});

test('anyone can read the legal documents', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('footer-rentalAgreement').click();
  await expect(page).toHaveURL('/rental-agreement');
  await expect(page.getByTestId('page-title')).toHaveText('Rental agreement');
  await expect(page.getByRole('note')).toContainText('Example document');
  await page.getByTestId('footer-privacy').click();
  await expect(page.getByTestId('page-title')).toHaveText('Privacy policy');
});

test('the phone menu shows the navigation and the account', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'customer');
  await page.getByTestId('nav-menu').click();

  const panel = page.getByTestId('account-panel');
  await expect(panel).toContainText('Jan Novák');
  await expect(panel.getByTestId('role-badge')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(1);

  await panel.getByTestId('account-link').click();
  await expect(page).toHaveURL('/profile');
  await expect(panel).toBeHidden();
});

test('the landing page fits a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
});
