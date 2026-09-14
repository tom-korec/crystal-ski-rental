import { getTranslations } from 'next-intl/server';

import { PageHeader } from '~/components/common/page-header';
import { requireStaff } from '~/server/better-auth/guards';

export default async function FrontDeskPage() {
  await requireStaff();
  const t = await getTranslations('frontDesk');

  return <PageHeader title={t('title')} description={t('description')} />;
}
