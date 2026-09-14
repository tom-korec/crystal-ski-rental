import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { requireStaff } from '~/server/better-auth/guards';

import { FrontDesk } from './_components/front-desk';

export default async function FrontDeskPage() {
  await requireStaff();
  const t = await getTranslations('frontDesk');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <Suspense>
        <FrontDesk />
      </Suspense>
    </>
  );
}
