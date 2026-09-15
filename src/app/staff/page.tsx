import { Suspense } from 'react';

import { requireStaff } from '~/server/better-auth/guards';

import { FrontDesk } from './_components/front-desk';

export default async function FrontDeskPage() {
  await requireStaff();

  return (
    <Suspense>
      <FrontDesk />
    </Suspense>
  );
}
