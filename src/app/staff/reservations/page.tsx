import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { requireStaff } from '~/server/better-auth/guards';

import { ReservationSearch } from './_components/reservation-search';

export default async function StaffReservationsPage() {
  await requireStaff();
  const t = await getTranslations('staffReservationSearch');

  return (
    <>
      <PageHeader title={t('title')} visuallyHidden />
      <Suspense>
        <ReservationSearch />
      </Suspense>
    </>
  );
}
