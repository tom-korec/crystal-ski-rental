import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { requireStaff } from '~/server/better-auth/guards';

import { AccountList } from './_components/account-list';

export default async function AccountsPage() {
  const user = await requireStaff();
  const t = await getTranslations('accounts');

  return (
    <>
      <PageHeader title={t('title')} visuallyHidden />
      <Suspense>
        <AccountList actorRole={user.role} />
      </Suspense>
    </>
  );
}
