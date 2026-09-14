import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { requireCustomer } from '~/server/better-auth/guards';

import { SkiSearch } from './_components/ski-search';

export default async function FindSkisPage() {
  await requireCustomer();
  const t = await getTranslations('search');

  return (
    <>
      <PageHeader title={t('title')} visuallyHidden />
      {/* The search reads its filters from the URL, which needs a Suspense boundary. */}
      <Suspense fallback={<CardGridSkeleton />}>
        <SkiSearch />
      </Suspense>
    </>
  );
}
