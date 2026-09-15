import { Suspense } from 'react';

import { requireAdmin } from '~/server/better-auth/guards';

import { Catalog } from './_components/catalog';

export default async function CatalogPage() {
  await requireAdmin();

  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
