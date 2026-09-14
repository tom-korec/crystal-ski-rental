import { expect, type Page, test } from '@playwright/test';

import { signIn } from './helpers';

async function openJasnaDesk(page: Page) {
  await page.getByRole('tab', { name: 'Jasná' }).click();
  await expect(page).toHaveURL(/store=/);
}

const section = (page: Page, name: string) => page.getByTestId(`desk-${name}`);

test.describe('front desk', () => {
  test('works through pickups, a no-show and returns', async ({ page }) => {
    await signIn(page, 'manager');
    await openJasnaDesk(page);

    for (const name of ['pickupsDueToday', 'overduePickups', 'returnsDueToday', 'overdueReturns']) {
      await expect(section(page, name).getByTestId('section-count')).toHaveText('1');
    }

    await section(page, 'pickupsDueToday').getByTestId('pick-up').click();
    await expect(section(page, 'pickupsDueToday').getByTestId('section-count')).toHaveText('0');

    await section(page, 'overduePickups').getByTestId('cancel-booking').click();
    await page.getByTestId('confirm-action').click();
    await expect(section(page, 'overduePickups').getByTestId('section-count')).toHaveText('0');

    await section(page, 'returnsDueToday').getByTestId('mark-returned').click();
    await page.getByTestId('confirm-action').click();
    await expect(section(page, 'returnsDueToday').getByTestId('section-count')).toHaveText('0');
    await section(page, 'overdueReturns').getByTestId('mark-returned').click();
    await page.getByTestId('confirm-action').click();
    await expect(section(page, 'overdueReturns').getByTestId('section-count')).toHaveText('0');
  });
});

test.describe('fleet', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'manager');
    await page.getByTestId('nav-fleet').click();
    await expect(page).toHaveURL('/staff/skis');
  });

  test('adds a ski, takes it out of rental and deletes it', async ({ page }) => {
    await page.getByTestId('add-ski').click();
    const dialog = page.getByTestId('add-ski-dialog');
    await dialog.getByTestId('submit-ski').click();
    await expect(dialog.getByText('Choose a model.')).toBeVisible();

    await dialog.getByLabel('Inventory code').fill('sk-e2e1');
    await dialog.getByTestId('ski-model').click();
    await page.getByRole('option', { name: 'Elan Wingman 78 C' }).click();
    await dialog.getByTestId('ski-store').click();
    await page.getByRole('option', { name: 'Donovaly' }).click();
    await dialog.getByLabel('Length (cm)').fill('163');
    await dialog.getByTestId('submit-ski').click();

    await expect(page).toHaveURL(/\/staff\/skis\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('inventory-code')).toHaveText('SK-E2E1');
    await expect(page.getByTestId('availability')).toHaveText('Offered for rental');

    await page.getByTestId('toggle-availability').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByTestId('availability')).toHaveText('Out of rental');

    await page.getByTestId('delete-ski').click();
    await page.getByTestId('confirm-delete').click();
    await expect(page).toHaveURL('/staff/skis');
    await page.getByTestId('filter-code').fill('E2E1');
    await expect(page.getByTestId('fleet-count')).toHaveText('No skis');
  });

  test('refuses to move or delete a ski a customer has booked', async ({ page }) => {
    await page.getByTestId('filter-code').fill('SK-0005');
    await expect(page.getByTestId('ski-card')).toHaveCount(1);
    await page.getByTestId('open-ski').click();

    await page.getByTestId('edit-ski').click();
    await expect(page.getByTestId('edit-store')).toBeDisabled();
    await page.keyboard.press('Escape');

    await page.getByTestId('delete-ski').click();
    const dialog = page.getByTestId('delete-ski-dialog');
    await expect(dialog).toContainText('booked or picked up');
    await expect(dialog.getByTestId('confirm-delete')).toHaveCount(0);
  });
});
