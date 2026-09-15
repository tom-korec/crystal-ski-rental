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

  test('changes the ski filters as a draft, applied together', async ({ page }) => {
    const stores = await page.request
      .get('/api/trpc/store.list')
      .then((response) => response.json() as Promise<{ result: { data: { json: { id: string; name: string }[] } } }>)
      .then((body) => body.result.data.json);
    const jasna = stores.find((store) => store.name === 'Jasná');
    await page.goto(`/app?from=${dayFromToday(45)}&to=${dayFromToday(48)}&store=${jasna?.id}`);
    await expect(page.getByTestId('ski-count')).toHaveText(/skis? free/);
    const count = await page.getByTestId('ski-count').textContent();

    await page.getByTestId('more-filters').click();
    await expect(page.getByTestId('apply-filters')).toBeDisabled();
    await page.locator('#filter-gender').click();
    await page.getByRole('option', { name: 'Kids' }).click();

    // Nothing changes until the filters are applied.
    await expect(page).not.toHaveURL(/gender=/);
    await expect(page.getByTestId('ski-count')).toHaveText(count ?? '');
    await page.getByTestId('discard-filters').click();
    await expect(page.locator('#filter-gender')).toContainText('Anyone');

    await page.locator('#filter-gender').click();
    await page.getByRole('option', { name: 'Kids' }).click();
    await page.getByTestId('apply-filters').click();
    await expect(page).toHaveURL(/gender=KID/);
    await expect(page.getByTestId('ski-count')).not.toHaveText(count ?? '');
    await expect(page.getByTestId('more-filters')).toContainText('1');

    await page.getByTestId('clear-filters').click();
    await expect(page).not.toHaveURL(/gender=/);
  });

  test('reserves two pairs from one store in one booking, and cancels it', async ({ page }) => {
    // Five days earns 10 %. The search offers only pairs free for these dates, whatever the seed booked.
    const from = dayFromToday(45);
    const to = dayFromToday(50);
    const stores = await page.request
      .get('/api/trpc/store.list')
      .then((response) => response.json() as Promise<{ result: { data: { json: { id: string; name: string }[] } } }>)
      .then((body) => body.result.data.json);
    const donovaly = stores.find((store) => store.name === 'Donovaly');
    const jasna = stores.find((store) => store.name === 'Jasná');

    await page.goto(`/app?from=${from}&to=${to}&store=${donovaly?.id}&sort=priceAsc`);
    const cards = page.getByTestId('ski-card');
    // The dates say how long the rental is and what that earns; the cards carry only their total.
    const bar = page.getByTestId('customer-search-bar');
    await expect(bar.getByTestId('rental-days')).toHaveText('5 days');
    await expect(bar.getByTestId('discount-badge')).toHaveText('−10 %');
    await expect(cards.first()).not.toContainText('Donovaly');
    await expect(cards.first()).not.toContainText('/ day');
    const quoted = await Promise.all([0, 1].map((n) => cards.nth(n).getByTestId('quote-total').textContent()));

    const dialog = page.getByTestId('add-to-reservation-dialog');
    await cards.nth(0).getByTestId('reserve').click();
    await expect(dialog.getByTestId('add-outcome')).toHaveAttribute('data-outcome', 'added');
    await dialog.getByTestId('reserve-another').click();
    await expect(cards.nth(0).getByTestId('in-reservation')).toBeVisible();

    await cards.nth(1).getByTestId('reserve').click();
    await expect(dialog.getByTestId('cart-summary')).toContainText('2 pairs');
    await dialog.getByTestId('reserve-another').click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    // A pair from another store cannot join this reservation.
    await page.goto(`/app?from=${from}&to=${to}&store=${jasna?.id}`);
    await cards.first().getByTestId('reserve').click();
    await expect(dialog.getByTestId('add-outcome')).toHaveAttribute('data-outcome', 'otherStore');
    await dialog.getByRole('button', { name: 'Keep my reservation' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    await page.getByTestId('cart-link').click();
    await expect(page).toHaveURL('/app/reserve');
    await expect(page.getByTestId('checkout-line')).toHaveCount(2);
    await expect(page.getByTestId('line-days').first()).toContainText('× 5 days');
    await expect(page.getByTestId('checkout-summary').getByTestId('discount-badge')).toHaveText('−10 %');
    const euros = (text: string | null | undefined) => Number((text ?? '').replace(/[^\d.]/g, ''));
    const total = euros(quoted[0]) + euros(quoted[1]);
    await expect(page.getByTestId('checkout-total')).toHaveText(`€${total.toFixed(2)}`);

    // The profile's mailing address is filled in; invoices go to it this time.
    await expect(page.locator('#checkout-mailing-street')).not.toHaveValue('');
    await page.getByTestId('invoice-to-mailing').check();
    await page.getByLabel('Note (optional)').fill('Arriving on the first bus.');
    await page.getByTestId('confirm-reservation').click();

    await expect(page.getByTestId('checkout-booked')).toContainText('2 pairs of skis are waiting at Donovaly');
    await expect(page.getByTestId('cart-link')).toHaveCount(0);
    await page.getByTestId('booked-reservations').click();
    await expect(page).toHaveURL('/app/reservations');

    const booking = page
      .getByTestId('reservation-card')
      .filter({ hasText: `€${total.toFixed(2)}` })
      .first();
    await expect(booking).toHaveAttribute('data-status', 'CREATED');
    await expect(booking.getByTestId('reservation-skis')).toContainText('2 pairs');
    // Customers never see inventory codes.
    await expect(page.getByTestId('inventory-code')).toHaveCount(0);

    await booking.getByTestId('reservation-details').click();
    await expect(booking.getByTestId('reservation-note')).toContainText('Arriving on the first bus.');
    await expect(booking.getByTestId('reservation-addresses')).toContainText('Same as mailing address');
    await booking.getByTestId('cancel-reservation').click();
    await page.getByTestId('confirm-action').click();
    await expect(booking).toHaveAttribute('data-status', 'CANCELLED_BY_USER');
  });

  test('removes a pair on the reservation page, and sends invoices elsewhere', async ({ page }) => {
    const from = dayFromToday(52);
    const to = dayFromToday(54);
    const stores = await page.request
      .get('/api/trpc/store.list')
      .then((response) => response.json() as Promise<{ result: { data: { json: { id: string; name: string }[] } } }>)
      .then((body) => body.result.data.json);
    const pleso = stores.find((store) => store.name === 'Štrbské Pleso');

    await page.goto(`/app?from=${from}&to=${to}&store=${pleso?.id}`);
    const cards = page.getByTestId('ski-card');
    const dialog = page.getByTestId('add-to-reservation-dialog');
    for (const n of [0, 1]) {
      await cards.nth(n).getByTestId('reserve').click();
      await dialog.getByTestId('reserve-another').click();
    }
    await page.getByTestId('cart-link').click();

    await page.getByTestId('remove-line').first().click();
    await expect(page.getByTestId('checkout-line')).toHaveCount(1);
    await expect(page.getByTestId('cart-count')).toHaveText('1');

    await page.getByTestId('invoice-to-mailing').uncheck();
    await page.locator('#checkout-invoice-recipient').fill('');
    await page.getByTestId('confirm-reservation').click();
    await expect(page.getByText('Enter who invoices are made out to.')).toBeVisible();

    await page.locator('#checkout-invoice-recipient').fill('Tatra Outdoor a.s.');
    await page.locator('#checkout-invoice-street').fill('Hlavná');
    await page.locator('#checkout-invoice-house-number').fill('1');
    await page.locator('#checkout-invoice-zip-code').fill('059 85');
    await page.locator('#checkout-invoice-city').fill('Štrbské Pleso');
    await page.getByTestId('confirm-reservation').click();
    await expect(page.getByTestId('checkout-booked')).toContainText('Your pair of skis is waiting');

    // The invoice address went to the profile too.
    await page.goto('/profile');
    await expect(page.locator('#invoice-recipient')).toHaveValue('Tatra Outdoor a.s.');
  });

  test('rates the rental and the skis together, and can edit both within the hour', async ({ page }) => {
    await page.goto('/app/reservations');
    await expect(page.getByTestId('reservation-card').first()).toBeVisible();
    // Returned today and rated twenty minutes ago, so still editable.
    await expect(page.locator('[data-testid="rate-reservation"][data-action="edit"]')).toHaveCount(1);

    // The newer rental, of two pairs: the rental is unrated, one model was rated long ago and reopens,
    // the other has never been rated.
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
    const models = dialog.getByTestId(/^model-\d+-rating-section$/);
    await expect(models).toHaveCount(2);
    const reopened = models.filter({ hasText: 'You rented these skis again' });
    const unrated = models.filter({ hasNotText: 'You rented these skis again' });

    await dialog.getByTestId('submit-rating').click();
    await expect(dialog.getByText('Choose a score.')).toHaveCount(2);
    await dialog.getByTestId('rental-score-4').click();
    await dialog.getByLabel('Note (optional)').fill('Quick and friendly.');
    await reopened.getByTestId(/-score-5$/).click();
    await unrated.getByTestId(/-score-3$/).click();
    await dialog.getByTestId('submit-rating').click();
    await expect(dialog).toBeHidden();

    await expect(newer.getByTestId('rental-score')).toHaveAttribute('data-score', '4');
    await expect(newer.getByTestId('models-rated')).toHaveText('2 of 2 rated');
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

  test('sees every pair of a reservation, each with its price', async ({ page }) => {
    await page.goto('/app/reservations');
    // The seeded family booking: two pairs from Jasná, with a note.
    const family = page
      .locator('[data-testid="reservation-card"][data-status="CREATED"]')
      .filter({ hasText: '2 pairs' })
      .filter({ hasText: 'Jasná' });
    await expect(family).toHaveCount(1);
    await family.getByTestId('reservation-details').click();
    await expect(family.getByTestId('reservation-items').locator('li')).toHaveCount(2);
    await expect(family.getByTestId('reservation-note')).toContainText('my daughter');
  });

  test('cannot cancel a rental that has started', async ({ page }) => {
    await page.goto('/app/reservations');
    const active = page.locator('[data-testid="reservation-card"][data-status="ACTIVE"]');
    await expect(active).toHaveCount(1);
    await expect(active.getByTestId('reservation-code')).toHaveText(/^[A-HJ-NP-Z2-9]{6}$/);
    await active.getByTestId('reservation-details').click();
    await expect(active.getByTestId('cancel-reservation')).toHaveCount(0);
  });

  test("opens the store page on the tab of the reservation's store", async ({ page }) => {
    await page.goto('/app/reservations');
    const booked = page.locator('[data-testid="reservation-card"][data-status="CREATED"]').first();
    await booked.getByTestId('reservation-details').click();
    await booked.getByTestId('store-details-link').click();

    await expect(page).toHaveURL(/\/app\/stores\?store=/);
    const selected = page.locator('[data-testid="store-tab"][aria-selected="true"]');
    await expect(selected).toHaveCount(1);
    const store = await selected.textContent();
    await expect(page.getByTestId('store-details')).toContainText(store ?? '');

    await page
      .getByTestId('store-tab')
      .filter({ hasNotText: store ?? '' })
      .first()
      .click();
    await expect(page.getByTestId('store-details')).not.toContainText(store ?? '');
  });
});
