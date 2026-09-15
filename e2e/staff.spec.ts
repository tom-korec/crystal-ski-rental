import { expect, type Page, test } from '@playwright/test';

import { signIn } from './helpers';

const section = (page: Page, name: string) => page.getByTestId(`desk-${name}`);

test.describe('front desk', () => {
  test('works through pickups, a no-show and returns', async ({ page }) => {
    // The demo manager runs Jasná, so the desk opens there with no other store to pick.
    await signIn(page, 'manager');
    await expect(page.getByText("Today's pickups and returns at Jasná")).toBeVisible();
    await expect(page.getByTestId('store-tab')).toHaveCount(0);

    for (const name of ['pickupsDueToday', 'overduePickups', 'returnsDueToday', 'overdueReturns']) {
      await expect(section(page, name).getByTestId('section-count')).toHaveText('1');
    }
    // Today's pickup is two pairs with a note for the store.
    await expect(section(page, 'pickupsDueToday').getByTestId('inventory-code')).toHaveCount(2);
    await expect(section(page, 'pickupsDueToday').getByTestId('reservation-note')).toContainText('bindings');

    await section(page, 'pickupsDueToday').getByTestId('pick-up').click();
    await expect(page.getByTestId('confirm-dialog')).toContainText('2 pairs');
    await page.getByTestId('confirm-action').click();
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

test.describe('reservations', () => {
  test('finds reservations by customer and by code, and opens one', async ({ page }) => {
    await signIn(page, 'manager');
    await page.getByTestId('nav-reservations').click();
    await expect(page).toHaveURL('/staff/reservations');

    // Accents are optional: "horvathova" finds Horváthová.
    await page.getByTestId('search-customer').fill('horvathova');
    await page.getByTestId('submit-search').click();
    await expect(page).toHaveURL(/q=horvathova/);
    const rows = page.getByTestId('staff-reservation-row');
    await expect(rows.first()).toContainText('Zuzana Horváthová');
    const code = (await rows.first().getByTestId('reservation-code').textContent())?.replace('#', '') ?? '';
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    await page.getByTestId('clear-search').click();
    await expect(page).toHaveURL('/staff/reservations');
    await page.getByTestId('search-code').fill(code.toLowerCase());
    await page.getByTestId('submit-search').click();
    await expect(page.getByTestId('reservation-count')).toHaveText('1 reservation');

    await rows.first().getByTestId('reservation-code').click();
    await expect(page).toHaveURL(/\/staff\/reservations\/[0-9a-f-]{36}$/);
    const detail = page.getByTestId('reservation-detail');
    await expect(detail.getByTestId('reservation-code').first()).toHaveText(code);
    await expect(detail.getByTestId('reservation-customer')).toHaveText('Zuzana Horváthová');
    await expect(detail.getByTestId('reservation-history')).toContainText('Booked');

    // Everything named on the page opens its own page.
    await detail.getByTestId('reservation-store-link').click();
    await expect(page).toHaveURL(/\/staff\/stores\?store=/);
    await page.goBack();
    await detail.getByTestId('reservation-customer').click();
    await expect(page.getByTestId('page-title')).toHaveText('Zuzana Horváthová');
    await page.goBack();
    await detail.getByTestId('inventory-code').first().click();
    await expect(page).toHaveURL(/\/staff\/skis\/[0-9a-f-]{36}$/);
    await page.getByTestId('model-fleet-link').click();
    await expect(page).toHaveURL(/\/staff\/skis\?model=/);
  });

  test('links a customer in a reservation list to their account', async ({ page }) => {
    await signIn(page, 'manager');
    await page.goto('/staff/reservations?q=novak');
    await page.getByTestId('customer-link').first().click();
    await expect(page.getByTestId('page-title')).toHaveText('Jan Novák');
  });

  test('opens a reservation from the front desk by its code', async ({ page }) => {
    await signIn(page, 'manager');
    // Any reservation will do; the front desk's own lists were worked through by the test above.
    await page.goto('/staff/reservations');
    const code = (await page.getByTestId('reservation-code').first().textContent())?.replace('#', '') ?? '';
    await page.getByTestId('nav-front-desk').click();

    await page.getByTestId('find-by-code').click();
    const dialog = page.getByTestId('find-by-code-dialog');
    await dialog.getByLabel('Reservation code').fill('ABC');
    await dialog.getByTestId('open-reservation').click();
    await expect(dialog.getByTestId('find-by-code-error')).toContainText('6 letters and digits');

    await dialog.getByLabel('Reservation code').fill('ZZZZ22');
    await dialog.getByTestId('open-reservation').click();
    await expect(dialog.getByTestId('find-by-code-error')).toContainText('No reservation has the code ZZZZ22');

    await dialog.getByLabel('Reservation code').fill(` ${code.slice(0, 3)}-${code.slice(3).toLowerCase()} `);
    await dialog.getByTestId('open-reservation').click();
    await expect(page).toHaveURL(/\/staff\/reservations\/[0-9a-f-]{36}$/);
    await expect(page.getByTestId('reservation-detail').getByTestId('reservation-code').first()).toHaveText(code);
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
    // A manager adds to their own store, and cannot pick another.
    await expect(dialog.getByTestId('ski-store')).toContainText('Jasná');
    await expect(dialog.getByTestId('ski-store')).toBeDisabled();
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
    // A draft until applied; Enter in the code field applies it.
    await expect(page).not.toHaveURL(/code=/);
    await page.getByTestId('filter-code').press('Enter');
    await expect(page.getByTestId('fleet-count')).toHaveText('No skis');
  });

  test('sees skis at other stores but cannot change them', async ({ page }) => {
    await page.locator('#filter-store').click();
    await page.getByRole('option', { name: 'Donovaly' }).click();
    await page.getByTestId('apply-filters').click();
    await page.getByTestId('open-ski').first().click();

    await expect(page.getByTestId('read-only-ski')).toContainText('Donovaly');
    await expect(page.getByTestId('edit-ski')).toHaveCount(0);
    await expect(page.getByTestId('toggle-availability')).toHaveCount(0);
    await expect(page.getByTestId('delete-ski')).toHaveCount(0);

    // The server refuses it too, whatever the page offers.
    const skiId = page.url().split('/').at(-1);
    const response = await page.request.post('/api/trpc/ski.update', {
      data: { json: { id: skiId, isAvailable: false } },
    });
    expect(response.status()).toBe(403);
  });

  test('refuses to move or delete a ski a customer has booked', async ({ page }) => {
    await page.getByTestId('filter-code').fill('SK-0005');
    await expect(page.getByTestId('discard-filters')).toBeVisible();
    await page.getByTestId('apply-filters').click();
    await expect(page).toHaveURL(/code=SK-0005/);
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
