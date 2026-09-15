import { Suspense } from 'react';

import { requireCustomer } from '~/server/better-auth/guards';

import { ReservationCheckout } from './_components/reservation-checkout';

export default async function ReservePage() {
  await requireCustomer();

  return (
    <Suspense>
      <ReservationCheckout />
    </Suspense>
  );
}
