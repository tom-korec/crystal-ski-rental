import { getTranslations } from 'next-intl/server';

import { PageHeader } from '~/components/common/page-header';
import { requireCustomer } from '~/server/better-auth/guards';

export default async function FindSkisPage() {
  await requireCustomer();
  const t = await getTranslations('search');

  return <PageHeader title={t('title')} description={t('description')} />;
}
