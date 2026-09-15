import { expect, type APIRequestContext, test } from '@playwright/test';

import { signIn } from './helpers';

// Customer addresses have no screen yet (FR-6), so this drives the API the screens will use.

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
