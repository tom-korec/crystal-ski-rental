import { Suspense } from 'react';

import { CustomerStores } from '~/components/stores/customer-stores';
import { APP_STORES } from '~/lib/routes';
import { type PageSearchParams, redirectSignedInShopper } from '~/server/better-auth/guards';

interface PublicStoresPageProps {
  searchParams: PageSearchParams;
}

export default async function PublicStoresPage({ searchParams }: PublicStoresPageProps) {
  await redirectSignedInShopper(APP_STORES, searchParams);

  return (
    <Suspense>
      <CustomerStores />
    </Suspense>
  );
}
