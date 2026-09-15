import { expect, test } from '@playwright/test';

import { dayFromToday, signIn } from './helpers';

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
    await dialog.getByLabel('Monday').fill('mornings');
    await dialog.getByTestId('save-entry').click();
    await expect(dialog.getByText('Write the hours like 8:00-16:30').first()).toBeVisible();

    await dialog.getByLabel('Monday').fill('9:00 – 12:00; 13:00 – 16:00');
    await dialog.getByTestId('copy-monday').click();
    await dialog.getByLabel('Sunday').fill('');
    await dialog.getByTestId('save-entry').click();

    // The new store opens on its own tab.
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-testid="store-tab"][aria-selected="true"]')).toHaveText('Kubínska hoľa');
    const store = page.getByTestId('store-details');
    await expect(store).toContainText('026 01 Dolný Kubín');
    await expect(store).toContainText('+421 000 000 105');
    await expect(store).toContainText('9:00 – 12:00, 13:00 – 16:00');
    await expect(store.getByText('Closed')).toBeVisible();
    await expect(page.getByTestId('store-ski-count')).toHaveText('No skis in the fleet');

    await page.getByTestId('delete-entry').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('store-tab').filter({ hasText: 'Kubínska hoľa' })).toHaveCount(0);
  });

  test('closes a store for a day, but not while a customer picks up that day', async ({ page }) => {
    await page.goto('/staff/stores');
    await page.getByTestId('store-tab').filter({ hasText: 'Jasná' }).click();
    const specialDays = page.getByTestId('special-days');

    // The demo customer's family booking starts at Jasná seven days from now.
    const pickup = dayFromToday(7);
    await specialDays.getByTestId('add-special-day').click();
    const dialog = page.getByTestId('special-day-dialog');
    await dialog.getByLabel('Date').fill(pickup);
    await dialog.getByLabel('Name (optional)').fill('Staff training');
    await dialog.getByTestId('special-day-closed').check();
    await dialog.getByTestId('save-special-day').click();
    await expect(dialog.getByTestId('special-day-error')).toContainText('68EK95');

    // Short hours that day are allowed.
    await dialog.getByTestId('special-day-closed').uncheck();
    await dialog.getByLabel('Opening hours').fill('10:00-13:00');
    await dialog.getByTestId('save-special-day').click();
    await expect(dialog).toBeHidden();
    const row = specialDays.getByTestId('special-day-row').filter({ hasText: 'Staff training' });
    await expect(row).toContainText('10:00 – 13:00');

    await row.getByTestId('delete-entry').click();
    await page.getByTestId('confirm-action').click();
    await expect(row).toHaveCount(0);
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
    await expect(dialog.getByText('Choose the store this manager runs.')).toBeVisible();
    await dialog.getByTestId('account-store').click();
    await page.getByRole('option', { name: 'Štrbské Pleso' }).click();
    await dialog.getByTestId('save-account').click();
    await expect(dialog).toBeHidden();

    const manager = await browser.newPage();
    await signIn(manager, 'manager');
    await manager.goto('/staff/accounts?q=ivana');
    await manager.getByTestId('account-row').getByRole('link').click();
    await expect(manager.getByTestId('page-title')).toHaveText('Ivana Staff');
    await expect(manager.getByTestId('account-store')).toHaveText('Štrbské Pleso');
    await expect(manager.getByTestId('edit-account')).toHaveCount(0);
    await expect(manager.getByTestId('remove-account')).toHaveCount(0);
    await manager.close();
  });
});
