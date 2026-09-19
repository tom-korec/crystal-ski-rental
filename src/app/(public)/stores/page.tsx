import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { CustomerStores } from '~/components/stores/customer-stores';
import { APP_STORES, STORES } from '~/lib/routes';
import { type PageSearchParams, redirectSignedInShopper } from '~/server/better-auth/guards';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('storeDirectory');

  return { title: t('title'), description: t('description'), alternates: { canonical: STORES } };
}

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
