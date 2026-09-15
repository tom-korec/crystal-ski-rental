import { expect, type APIRequestContext, test } from '@playwright/test';

import { signIn } from './helpers';

// Customer addresses (FR-6): the API, then the profile page's forms. The tests run in order and share data.

interface Address {
  kind: 'MAILING' | 'INVOICE';
  recipient: string | null;
  companyId: string | null;
  street: string;
  zipCode: string;
  country: string;
}

async function query<T>(request: APIRequestContext, path: string, input?: unknown) {
  const search = input === undefined ? '' : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const response = await request.get(`/api/trpc/${path}${search}`);
  return {
    status: response.status(),
    data: ((await response.json()) as { result?: { data: { json: T } } }).result?.data.json,
  };
}

async function mutate<T>(request: APIRequestContext, path: string, input: unknown) {
  const response = await request.post(`/api/trpc/${path}`, { data: { json: input } });
  return {
    status: response.status(),
    data: ((await response.json()) as { result?: { data: { json: T } } }).result?.data.json,
  };
}

test('a customer keeps a mailing and an invoice address, and staff can read them', async ({ page, browser }) => {
  await signIn(page, 'customer');

  const mine = await query<{ mailing: Address | null; invoice: Address | null }>(page.request, 'address.mine');
  expect(mine.data?.mailing).toMatchObject({ city: 'Bratislava', zipCode: '81109', country: 'SK' });
  expect(mine.data?.invoice).toMatchObject({ recipient: 'Novák Consulting s.r.o.', companyId: '12345678' });

  const saved = await mutate<Address>(page.request, 'address.save', {
    kind: 'MAILING',
    address: { street: 'Popradská', houseNumber: '2', city: 'Poprad', zipCode: '058 01' },
  });
  expect(saved.data).toMatchObject({ kind: 'MAILING', zipCode: '05801', country: 'SK', recipient: null });

  const withoutRecipient = await mutate(page.request, 'address.save', {
    kind: 'INVOICE',
    address: { street: 'Popradská', houseNumber: '2', city: 'Poprad', zipCode: '058 01' },
  });
  expect(withoutRecipient.status).toBe(400);

  expect((await mutate(page.request, 'address.remove', { kind: 'INVOICE' })).status).toBe(200);
  const after = await query<{ mailing: Address | null; invoice: Address | null }>(page.request, 'address.mine');
  expect(after.data?.invoice).toBeNull();
  expect(after.data?.mailing).toMatchObject({ city: 'Poprad' });

  const manager = await browser.newPage();
  await signIn(manager, 'manager');
  expect((await query(manager.request, 'address.mine')).status).toBe(403);

  const accounts = await query<{ items: { id: string; email: string }[] }>(manager.request, 'user.list', {
    search: 'customer@crystalskirental.test',
  });
  const jan = accounts.data?.items[0];
  expect(jan).toBeDefined();
  const account = await query<{ addresses: Address[] }>(manager.request, 'user.byId', { id: jan?.id });
  expect(account.data?.addresses).toEqual([expect.objectContaining({ kind: 'MAILING', city: 'Poprad' })]);
  await manager.close();
});

test('a customer edits their addresses on the profile page', async ({ page }) => {
  await signIn(page, 'customer');
  await page.goto('/profile');

  // The test above removed the invoice address and moved the mailing address to Poprad.
  const invoice = page.getByTestId('INVOICE-address');
  await expect(invoice.getByText('Invoices go to your mailing address')).toBeVisible();
  await expect(page.locator('#mailing-city')).toHaveValue('Poprad');

  await invoice.getByTestId('add-invoice-address').click();
  await page.locator('#invoice-street').fill('Mlynské nivy');
  await page.getByTestId('save-INVOICE-address').click();
  await expect(page.getByText('Enter who invoices are made out to.')).toBeVisible();

  await page.locator('#invoice-recipient').fill('Jan Novák');
  await page.locator('#invoice-house-number').fill('5');
  await page.locator('#invoice-zip-code').fill('82109');
  await page.locator('#invoice-city').fill('Bratislava');
  await page.getByTestId('save-INVOICE-address').click();
  await expect(page.getByTestId('INVOICE-address').getByRole('status')).toHaveText('Saved.');

  const mailing = page.getByTestId('MAILING-address');
  await mailing.locator('#mailing-zip-code').fill('1234');
  await mailing.getByTestId('save-MAILING-address').click();
  await expect(mailing.getByText('Enter a valid postal code')).toBeVisible();

  await page.reload();
  await expect(page.locator('#invoice-zip-code')).toHaveValue('821 09');
  await expect(page.locator('#invoice-recipient')).toHaveValue('Jan Novák');

  await page.getByTestId('remove-INVOICE-address').click();
  await expect(page.getByTestId('INVOICE-address').getByText('Invoices go to your mailing address')).toBeVisible();
});
