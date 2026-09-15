import { Suspense } from 'react';

import { requireCustomer } from '~/server/better-auth/guards';

import { StoreDirectory } from './_components/store-directory';

export default async function StoresPage() {
  await requireCustomer();

  return (
    <Suspense>
      <StoreDirectory />
    </Suspense>
  );
}
