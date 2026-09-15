import { Suspense } from 'react';

import { requireAdmin } from '~/server/better-auth/guards';

import { ModelsPage } from './_components/models-page';

export default async function StaffModelsPage() {
  await requireAdmin();

  return (
    <Suspense>
      <ModelsPage />
    </Suspense>
  );
}
