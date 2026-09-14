import { getTranslations } from 'next-intl/server';

import { PageHeader } from '~/components/common/page-header';
import { requireUser } from '~/server/better-auth/guards';

import { PasswordForm } from './_components/password-form';
import { ProfileForm } from './_components/profile-form';

export default async function ProfilePage() {
  const user = await requireUser();
  const t = await getTranslations('profile');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm name={user.name} email={user.email} />
        <PasswordForm />
      </div>
    </>
  );
}
