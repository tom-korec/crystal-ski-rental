import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { requireStaff } from '~/server/better-auth/guards';

import { Fleet } from './_components/fleet';

export default async function FleetPage() {
  await requireStaff();
  const t = await getTranslations('fleet');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Suspense fallback={<CardGridSkeleton />}>
        <Fleet />
      </Suspense>
    </>
  );
}
