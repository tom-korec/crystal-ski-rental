import { expect, test } from '@playwright/test';

import { signIn } from './helpers';

test.describe('admin', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'admin');
  });

  test('manages brands and model prices, and refuses to delete a brand in use', async ({ page }) => {
    await page.getByTestId('nav-models').click();
    await expect(page).toHaveURL('/staff/models');
    await page.getByTestId('tab-brands').click();

    await page.getByTestId('add-brand').click();
    await page.getByTestId('brand-dialog').getByLabel('Name').fill('Blizzard');
    await page.getByTestId('save-entry').click();
    await expect(page.getByTestId('brand-row').filter({ hasText: 'Blizzard' })).toBeVisible();

    await page.getByTestId('brand-row').filter({ hasText: 'Atomic' }).getByTestId('delete-entry').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('confirm-dialog').getByRole('alert')).toContainText('still has');
    await page.keyboard.press('Escape');

    await page.getByTestId('tab-models').click();
    const row = page.getByTestId('model-row').filter({ hasText: 'Head Kore 93' });
    await row.getByTestId('edit-entry').click();
    const dialog = page.getByTestId('model-dialog');
    await dialog.getByLabel('Price per day (€)').fill('abc');
    await dialog.getByTestId('save-entry').click();
    await expect(dialog.getByText('Enter a price like 38 or 38.50')).toBeVisible();
    await dialog.getByLabel('Price per day (€)').fill('99');
    await dialog.getByTestId('save-entry').click();
    await expect(row).toContainText('€99.00');
  });

  test('keeps store addresses, contacts and opening hours', async ({ page }) => {
    await page.getByTestId('nav-stores').click();
    await expect(page).toHaveURL('/staff/stores');
    await page.getByTestId('add-store').click();
    const dialog = page.getByTestId('store-dialog');
    await dialog.getByLabel('Name').fill('Kubínska hoľa');
    await dialog.getByLabel('Street').fill('Hlavná');
    await dialog.getByLabel('No.').fill('5');
    await dialog.getByLabel('City').fill('Dolný Kubín');
    await dialog.getByLabel('Zip code').fill('26');
    await dialog.getByLabel('Phone').fill('+421 000 000 105');
    await dialog.getByLabel('E-mail').fill('kubin@crystalskirental.test');
    await dialog.getByTestId('save-entry').click();
    await expect(dialog.getByText('Enter a zip code like 031 01.')).toBeVisible();

    await dialog.getByLabel('Zip code').fill('026 01');
    await dialog.getByLabel('Monday').fill('9:00 – 16:00');
    await dialog.getByTestId('copy-monday').click();
    await dialog.getByTestId('save-entry').click();

    // The new store opens on its own tab.
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-testid="store-tab"][aria-selected="true"]')).toHaveText('Kubínska hoľa');
    const store = page.getByTestId('store-details');
    await expect(store).toContainText('026 01 Dolný Kubín');
    await expect(store).toContainText('+421 000 000 105');
    await expect(page.getByTestId('store-ski-count')).toHaveText('No skis in the fleet');

    await page.getByTestId('delete-entry').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('store-tab').filter({ hasText: 'Kubínska hoľa' })).toHaveCount(0);
  });

  test('creates a staff account, which a manager then cannot edit', async ({ page, browser }) => {
    await page.goto('/staff/accounts');
    await page.getByTestId('add-account').click();
    const dialog = page.getByTestId('account-dialog');
    await dialog.getByLabel('Name').fill('Ivana Staff');
    await dialog.getByLabel('E-mail').fill('ivana.staff@crystalskirental.test');
    await dialog.getByLabel('Password').fill('Manager123!');
    await dialog.getByTestId('account-role').click();
    await page.getByRole('option', { name: 'Manager' }).click();
    await dialog.getByTestId('save-account').click();
    await expect(dialog).toBeHidden();

    const manager = await browser.newPage();
    await signIn(manager, 'manager');
    await manager.goto('/staff/accounts?q=ivana');
    await manager.getByTestId('account-row').getByRole('link').click();
    await expect(manager.getByTestId('page-title')).toHaveText('Ivana Staff');
    await expect(manager.getByTestId('edit-account')).toHaveCount(0);
    await expect(manager.getByTestId('remove-account')).toHaveCount(0);
    await manager.close();
  });
});
