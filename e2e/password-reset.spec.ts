import { expect, test } from '@playwright/test';

import { ACCOUNTS } from './helpers';
import { clearMailbox, linkIn, waitForEmail } from './mailpit';
import { mailpitUrl } from './test-env';

/** A signed-up address that can receive mail: the seeded accounts use unreachable `.test` domains. */
function newCustomer() {
  return { name: 'Reset Tester', email: `reset.${Date.now()}@crystal-e2e.dev`, password: 'Reset12345!' };
}

test.describe('password reset', () => {
  test('a customer sets a new password from the e-mailed link (FR-8)', async ({ page }) => {
    await clearMailbox();
    const customer = newCustomer();

    await page.goto('/');
    await page.getByTestId('auth-switch').click();
    await page.getByLabel('Name').fill(customer.name);
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByLabel('Password').fill(customer.password);
    await page.getByTestId('signup-accept').check();
    await page.getByTestId('signup-submit').click();
    await expect(page).toHaveURL('/app');
    await page.getByTestId('account-menu').click();
    await expect(page.getByTestId('account-panel')).toBeVisible();
    await page.getByTestId('sign-out').click();
    await expect(page).toHaveURL('/');

    await page.getByTestId('forgot-password').click();
    await expect(page).toHaveURL('/forgot-password');
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByTestId('reset-submit').click();
    await expect(page.getByTestId('reset-requested')).toBeVisible();

    const email = await waitForEmail(customer.email);
    expect(email.subject).toContain('password');

    await page.goto(linkIn(email.text));
    await expect(page).toHaveURL(/\/reset-password\?token=/);

    const newPassword = 'Powder12345!';
    await page.getByLabel('New password').fill(newPassword);
    await page.getByTestId('reset-submit').click();
    await expect(page.getByTestId('reset-done')).toBeVisible();

    await page.goto('/');
    await page.getByLabel('E-mail').fill(customer.email);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByTestId('signin-submit').click();
    await expect(page).toHaveURL('/app');
  });

  test('a seeded demo account is never sent a reset link', async ({ page }) => {
    await clearMailbox();

    await page.goto('/forgot-password');
    await page.getByLabel('E-mail').fill(ACCOUNTS.admin.email);
    await page.getByTestId('reset-submit').click();

    // The same confirmation as for an address with an account, so it reveals nothing.
    await expect(page.getByTestId('reset-requested')).toBeVisible();

    const inbox = await fetch(`${mailpitUrl}/api/v1/messages`);
    const { messages } = (await inbox.json()) as { messages: unknown[] };
    expect(messages).toHaveLength(0);
  });

  test('a spent or missing token cannot set a password', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByTestId('reset-invalid')).toBeVisible();
  });
});
