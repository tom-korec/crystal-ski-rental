import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { requireAdmin } from '~/server/better-auth/guards';

import { Catalog } from './_components/catalog';

export default async function CatalogPage() {
  await requireAdmin();
  const t = await getTranslations('catalogAdmin');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Suspense>
        <Catalog />
      </Suspense>
    </>
  );
}
