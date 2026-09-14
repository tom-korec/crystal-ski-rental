import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { BackLink } from '~/components/common/back-link';
import { STAFF_SKIS } from '~/lib/routes';
import { requireStaff } from '~/server/better-auth/guards';

import { SkiDetail } from './_components/ski-detail';

interface SkiPageProps {
  params: Promise<{ id: string }>;
}

export default async function SkiPage({ params }: SkiPageProps) {
  await requireStaff();
  const { id } = await params;
  const t = await getTranslations('skiDetail');

  return (
    <>
      <BackLink href={STAFF_SKIS} label={t('back')} />
      <Suspense>
        <SkiDetail id={id} />
      </Suspense>
    </>
  );
}
