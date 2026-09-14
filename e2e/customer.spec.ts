import { expect, test } from '@playwright/test';

import { dayFromToday, signIn } from './helpers';

test.describe('customer', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, 'customer');
  });

  test('picks a store and dates before any skis are shown, and can move the first day later', async ({ page }) => {
    await expect(page.getByTestId('customer-search')).toBeVisible();
    await expect(page.getByTestId('ski-card')).toHaveCount(0);
    await expect(page.getByTestId('show-skis')).toBeDisabled();

    await page.getByTestId('store-option').filter({ hasText: 'Jasná' }).click();
    await expect(page.getByTestId('show-skis')).toBeDisabled();

    const days = page.getByTestId('search-dates-calendar').locator('[role="grid"] button:not([disabled])');
    await page.getByTestId('search-dates').click();
    await days.nth(2).click();
    await expect(page.getByTestId('search-dates-hint')).toContainText('other day');
    await days.nth(4).click();
    const firstPick = await page.getByTestId('search-dates').textContent();

    // Picking again starts from the first day, even when it is later than the current range.
    await page.getByTestId('search-dates').click();
    await days.nth(6).click();
    await days.nth(9).click();
    await expect(page.getByTestId('search-dates-calendar')).toBeHidden();
    const laterPick = await page.getByTestId('search-dates').textContent();
    expect(laterPick).not.toBe(firstPick);

    // The second click always finishes the range, even on a day before the first click.
    await page.getByTestId('search-dates').click();
    await days.nth(9).click();
    await days.nth(6).click();
    await expect(page.getByTestId('search-dates-calendar')).toBeHidden();
    await expect(page.getByTestId('search-dates')).toHaveText(laterPick ?? '');

    await page.getByTestId('show-skis').click();
    await expect(page).toHaveURL(/store=.+from=.+to=/);
    await expect(page.getByTestId('customer-search-bar')).toBeVisible();
    await expect(page.getByTestId('ski-card').first()).toBeVisible();
  });

  test('searches, books with the length-of-rental discount, and cancels', async ({ page }) => {
    // Past the end of the seeded bookings, so every Donovaly ski is free; five days earns 10 %.
    const from = dayFromToday(45);
    const to = dayFromToday(50);
    const store = await page.request
      .get('/api/trpc/store.list')
      .then((response) => response.json() as Promise<{ result: { data: { json: { id: string; name: string }[] } } }>)
      .then((body) => body.result.data.json.find((candidate) => candidate.name === 'Donovaly'));
    expect(store).toBeDefined();

    await page.goto(`/app?from=${from}&to=${to}&store=${store?.id}&sort=priceAsc`);
    const card = page.getByTestId('ski-card').first();
    await expect(card).toBeVisible();
    await expect(card.getByText('−10 %')).toBeVisible();
    const quoted = await card.getByTestId('quote-total').textContent();

    await card.getByTestId('reserve').click();
    const dialog = page.getByTestId('reserve-dialog');
    await expect(dialog.getByTestId('breakdown-total')).toHaveText(quoted ?? '');
    await expect(dialog.getByTestId('store-details')).toContainText('Donovaly');
    await dialog.getByTestId('confirm-reservation').click();
    await expect(dialog.getByRole('heading', { name: 'Booked' })).toBeVisible();

    await dialog.getByTestId('booked-reservations').click();
    await expect(page).toHaveURL('/app/reservations');

    const booking = page
      .getByTestId('reservation-card')
      .filter({ hasText: quoted ?? '' })
      .first();
    await expect(booking).toHaveAttribute('data-status', 'CREATED');
    await expect(booking.getByTestId('reservation-total')).toHaveText(quoted ?? '');
    // Customers never see inventory codes.
    await expect(page.getByTestId('inventory-code')).toHaveCount(0);

    await booking.getByTestId('cancel-reservation').click();
    await page.getByTestId('confirm-action').click();
    await expect(booking).toHaveAttribute('data-status', 'CANCELLED_BY_USER');
  });

  test('rates a returned rental and updates a model rating through a newer rental', async ({ page }) => {
    await page.goto('/app/reservations');
    await expect(page.getByTestId('reservation-card').first()).toBeVisible();

    await page.getByTestId('rate-rental').filter({ hasText: 'Rate rental' }).first().click();
    const rental = page.getByTestId('rate-rental-dialog');
    await rental.getByTestId('submit-rating').click();
    await expect(rental.getByText('Choose a score.')).toBeVisible();
    await rental.getByTestId('rental-score-4').click();
    await rental.getByLabel('Note (optional)').fill('Quick and friendly.');
    await rental.getByTestId('submit-rating').click();
    await expect(rental).toBeHidden();
    await expect(page.getByTestId('rate-rental').filter({ hasText: /Edit rental rating/ })).toHaveCount(2);

    await page.getByTestId('rate-model').filter({ hasText: 'Update ski rating' }).click();
    const model = page.getByTestId('rate-model-dialog');
    await expect(model.getByText('You rented this model again')).toBeVisible();
    await model.getByTestId('model-score-5').click();
    await model.getByTestId('submit-rating').click();
    await expect(model).toBeHidden();

    // The rental whose edit window closed long ago now shows the updated model score as locked.
    await expect(page.getByTestId('model-rating-locked')).toContainText('5 / 5');
  });

  test('cannot cancel a rental that has started', async ({ page }) => {
    await page.goto('/app/reservations');
    const active = page.locator('[data-testid="reservation-card"][data-status="ACTIVE"]');
    await expect(active).toHaveCount(1);
    await expect(active.getByTestId('cancel-reservation')).toHaveCount(0);
  });
});
