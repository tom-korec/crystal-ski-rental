import { Suspense } from 'react';

import { requireCustomer } from '~/server/better-auth/guards';

import { CustomerStores } from '~/components/stores/customer-stores';

export default async function StoresPage() {
  await requireCustomer();

  return (
    <Suspense>
      <CustomerStores />
    </Suspense>
  );
}
