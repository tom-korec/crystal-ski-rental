import { APP_RESERVE } from '~/lib/routes';
import { type PageSearchParams, redirectSignedInShopper } from '~/server/better-auth/guards';

import { GuestReservation } from './_components/guest-reservation';

interface PublicReservePageProps {
  searchParams: PageSearchParams;
}

export default async function PublicReservePage({ searchParams }: PublicReservePageProps) {
  await redirectSignedInShopper(APP_RESERVE, searchParams);

  return <GuestReservation />;
}
