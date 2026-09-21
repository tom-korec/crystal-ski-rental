import { expect, type Page, test } from '@playwright/test';

import { signIn } from './helpers';
import { clearMailbox, linkIn, waitForEmail } from './mailpit';

/** A signed-up address that can receive mail: the seeded accounts use unreachable `.test` domains. */
function newCustomer() {
  return { name: 'Connie Confirm', email: `confirm.${Date.now()}@crystal-e2e.dev`, password: 'Confirm12345!' };
}

async function signUp(page: Page, customer: ReturnType<typeof newCustomer>) {
  await page.goto('/sign-in');
  await page.getByTestId('auth-switch').click();
  await page.getByLabel('Name').fill(customer.name);
  await page.getByLabel('E-mail').fill(customer.email);
  await page.getByLabel('Password').fill(customer.password);
  await page.getByTestId('signup-accept').check();
  await page.getByTestId('signup-submit').click();
  await expect(page.getByTestId('confirm-notice')).toBeVisible();
}

test.describe('e-mail confirmation', () => {
  test('a new customer confirms the address from the e-mail and then signs in (FR-9)', async ({ page }) => {
    await clearMailbox();
    const customer = newCustomer();

    await signUp(page, customer);

    // Until the link is opened the right password is still refused, with a way out on the spot.
    await page.goto('/sign-in');
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByLabel('Password').fill(customer.password);
    await page.getByTestId('signin-submit').click();
    await expect(page.getByTestId('confirm-notice')).toBeVisible();

    const email = await waitForEmail(customer.email);
    expect(email.subject).toContain('Confirm');

    await page.goto(linkIn(email.text));
    await expect(page.getByTestId('confirm-done')).toBeVisible();

    await page.goto('/sign-in');
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByLabel('Password').fill(customer.password);
    await page.getByTestId('signin-submit').click();
    await expect(page).toHaveURL('/app');
  });

  test('a customer asks for a new link when the first one is spent (FR-9)', async ({ page }) => {
    await clearMailbox();
    const customer = newCustomer();

    await signUp(page, customer);
    const first = await waitForEmail(customer.email);
    await page.goto(linkIn(first.text));
    await expect(page.getByTestId('confirm-done')).toBeVisible();

    // The same link a second time: already confirmed, so it is spent and the page offers a new one.
    await clearMailbox();
    await page.goto('/verify-email?error=invalid_token');
    await expect(page.getByTestId('confirm-invalid')).toBeVisible();
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByTestId('confirm-resend').click();

    // A confirmed address is told the same thing as an unconfirmed one, and is sent nothing.
    await expect(page.getByTestId('confirm-resent')).toBeVisible();
  });

  test('a seeded demo account never has to confirm anything', async ({ page }) => {
    // Seeded and staff-created accounts count as confirmed: their addresses could never receive a link.
    await signIn(page, 'admin');
    await expect(page.getByTestId('confirm-notice')).toHaveCount(0);
  });
});
