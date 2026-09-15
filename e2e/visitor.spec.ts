import { expect, test } from '@playwright/test';

import { ACCOUNTS, openStoreDates, signIn } from './helpers';

test.describe('visitor', () => {
  test('browses skis and stores without an account', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('landing-find-skis').click();
    await expect(page).toHaveURL('/search');
    await expect(page.getByTestId('nav-sign-in')).toBeVisible();

    const { store, from, to } = await openStoreDates(page, 'Jasná', 30, 3);
    await page.goto(`/search?store=${store.id}&from=${from}&to=${to}`);
    await expect(page.getByTestId('ski-card').first()).toBeVisible();

    await page.getByTestId('nav-stores').click();
    await expect(page).toHaveURL('/stores');
    await page.getByTestId('find-skis-at-store').click();
    await expect(page).toHaveURL(/\/search\?store=/);

    // Pages that belong to an account still ask for one.
    await page.goto('/app/reservations');
    await expect(page).toHaveURL('/');
  });

  test('reserves as a guest and books after signing in, replacing the account’s older reservation', async ({
    page,
  }) => {
    const { store: jasna, from, to } = await openStoreDates(page, 'Jasná', 40, 2);
    const { store: donovaly, from: laterFrom, to: laterTo } = await openStoreDates(page, 'Donovaly', 60, 3);
    const dialog = page.getByTestId('add-to-reservation-dialog');

    // The customer started a reservation on their account earlier, and signed out.
    await signIn(page, 'customer');
    await page.goto(`/app?store=${donovaly.id}&from=${laterFrom}&to=${laterTo}`);
    await page.getByTestId('ski-card').first().getByTestId('reserve').click();
    await dialog.getByTestId('reserve-another').click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
    await page.context().clearCookies();

    // Back as a visitor, they pick other skis.
    await page.goto(`/search?store=${jasna.id}&from=${from}&to=${to}`);
    await expect(page.getByTestId('cart-link')).toHaveCount(0);
    const card = page.getByTestId('ski-card').first();
    const skis = await card.getByRole('heading').first().textContent();
    await card.getByTestId('reserve').click();
    await dialog.getByTestId('proceed-to-reservation').click();

    await expect(page).toHaveURL('/reserve');
    await expect(page.getByTestId('checkout-line')).toHaveCount(1);
    await expect(page.getByTestId('checkout-total')).toBeVisible();
    await expect(page.getByTestId('confirm-reservation')).toHaveCount(0);

    const signInForm = page.getByTestId('guest-sign-in');
    await signInForm.getByLabel('E-mail').fill(ACCOUNTS.customer.email);
    await signInForm.getByLabel('Password').fill(ACCOUNTS.customer.password);
    await signInForm.getByTestId('signin-submit').click();

    await expect(page).toHaveURL('/app/reserve');
    await expect(page.getByTestId('cart-replaced')).toBeVisible();
    await expect(page.getByTestId('checkout-line')).toHaveCount(1);
    await expect(page.getByTestId('checkout-line')).toContainText(skis ?? '');
    await expect(page.locator('main')).not.toContainText('Donovaly');

    await page.getByTestId('accept-rental-agreement').check();
    await page.getByTestId('confirm-reservation').click();
    await expect(page.getByTestId('checkout-booked')).toContainText('Jasná');
  });

  test('a signed-in customer keeps their own pages', async ({ page }) => {
    await signIn(page, 'customer');
    await page.goto('/search?sort=priceAsc');
    await expect(page).toHaveURL('/app?sort=priceAsc');
    await page.goto('/stores');
    await expect(page).toHaveURL('/app/stores');
  });
});
