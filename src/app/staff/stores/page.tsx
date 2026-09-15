import { Suspense } from 'react';

import { isAdmin } from '~/lib/roles';
import { requireStaff } from '~/server/better-auth/guards';

import { StaffStores } from './_components/staff-stores';

export default async function StaffStoresPage() {
  const user = await requireStaff();

  return (
    <Suspense>
      <StaffStores canEdit={isAdmin(user.role)} />
    </Suspense>
  );
}
