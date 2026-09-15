import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { BackLink } from '~/components/common/back-link';
import { STAFF_RESERVATIONS } from '~/lib/routes';
import { requireStaff } from '~/server/better-auth/guards';

import { ReservationDetail } from './_components/reservation-detail';

interface ReservationPageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffReservationPage({ params }: ReservationPageProps) {
  await requireStaff();
  const { id } = await params;
  const t = await getTranslations('staffReservationDetail');

  return (
    <>
      <BackLink href={STAFF_RESERVATIONS} label={t('back')} />
      <Suspense>
        <ReservationDetail id={id} />
      </Suspense>
    </>
  );
}
