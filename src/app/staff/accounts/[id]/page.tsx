import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { BackLink } from '~/components/common/back-link';
import { STAFF_ACCOUNTS } from '~/lib/routes';
import { requireStaff } from '~/server/better-auth/guards';

import { AccountDetail } from './_components/account-detail';

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const user = await requireStaff();
  const { id } = await params;
  const t = await getTranslations('accounts');

  return (
    <>
      <BackLink href={STAFF_ACCOUNTS} label={t('back')} />
      <Suspense>
        <AccountDetail id={id} actor={{ id: user.id, role: user.role }} />
      </Suspense>
    </>
  );
}
