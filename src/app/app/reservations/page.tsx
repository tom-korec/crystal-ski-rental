import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { requireCustomer } from '~/server/better-auth/guards';

import { MyReservations } from './_components/my-reservations';

export default async function MyReservationsPage() {
  await requireCustomer();
  const t = await getTranslations('reservations');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Suspense fallback={<CardGridSkeleton count={3} />}>
        <MyReservations />
      </Suspense>
    </>
  );
}
