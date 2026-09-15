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

    // Picking again starts a new range at once: the calendar shows only the newly clicked day, not the
    // previous range extended to it.
    await page.getByTestId('search-dates').click();
    const drawn = page.getByTestId('search-dates-calendar').locator('td[data-selected="true"]');
    await expect(drawn).toHaveCount(3);
    await days.nth(6).click();
    await expect(drawn).toHaveCount(1);
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

    await booking.getByTestId('reservation-details').click();
    await booking.getByTestId('cancel-reservation').click();
    await page.getByTestId('confirm-action').click();
    await expect(booking).toHaveAttribute('data-status', 'CANCELLED_BY_USER');
  });

  test('rates the rental and the skis together, and can edit both within the hour', async ({ page }) => {
    await page.goto('/app/reservations');
    await expect(page.getByTestId('reservation-card').first()).toBeVisible();
    // Returned today and rated twenty minutes ago, so still editable.
    await expect(page.locator('[data-testid="rate-reservation"][data-action="edit"]')).toHaveCount(1);

    // The newer rental of a model rated long ago: the rental is unrated and the skis rating reopens.
    const rateButton = page.locator('[data-testid="rate-reservation"][data-action="rate"]');
    await expect(rateButton).toHaveCount(1);
    const card = page.locator('[data-testid="reservation-card"]', { has: rateButton });
    const id = await card.getAttribute('data-reservation-id');
    const newer = page.locator(`[data-testid="reservation-card"][data-reservation-id="${id}"]`);

    await rateButton.click();
    const dialog = page.getByTestId('rating-dialog');
    await expect(dialog.getByTestId('rating-window')).toHaveText(
      'You can edit your rating for one hour after submitting it.',
    );
    await expect(dialog.getByText('You rented these skis again')).toBeVisible();

    await dialog.getByTestId('submit-rating').click();
    await expect(dialog.getByText('Choose a score.')).toBeVisible();
    await dialog.getByTestId('rental-score-4').click();
    await dialog.getByLabel('Note (optional)').fill('Quick and friendly.');
    await dialog.getByTestId('model-score-5').click();
    await dialog.getByTestId('submit-rating').click();
    await expect(dialog).toBeHidden();

    await expect(newer.getByTestId('rental-score')).toHaveAttribute('data-score', '4');
    await expect(newer.getByTestId('model-score')).toHaveAttribute('data-score', '5');
    await expect(newer.getByTestId('rate-reservation')).toHaveAttribute('data-action', 'edit');

    await newer.getByTestId('rate-reservation').click();
    await expect(dialog.getByTestId('rating-window')).toHaveText(/^You can edit your rating until .+\.$/);
    await expect(dialog.getByTestId('rental-score-4').locator('input')).toBeChecked();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    // The rental rated long ago is locked, and shows the updated skis score.
    const older = page.locator('[data-testid="reservation-card"][data-status="RETURNED"]').last();
    await expect(older.getByTestId('rate-reservation')).toHaveCount(0);
    await expect(older.getByTestId('model-score')).toHaveAttribute('data-score', '5');
  });

  test('cannot cancel a rental that has started', async ({ page }) => {
    await page.goto('/app/reservations');
    const active = page.locator('[data-testid="reservation-card"][data-status="ACTIVE"]');
    await expect(active).toHaveCount(1);
    await active.getByTestId('reservation-details').click();
    await expect(active.getByTestId('store-details')).toBeVisible();
    await expect(active.getByTestId('cancel-reservation')).toHaveCount(0);
  });
});
