import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { PageSearchParams } from '~/server/better-auth/guards';
import { ResetPasswordForm } from './_components/reset-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('resetTitle') };
}

interface ResetPasswordPageProps {
  searchParams: PageSearchParams;
}

/** Where Better Auth's link lands: a valid token arrives as `?token=`, a spent one as `?error=`. */
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const token = (await searchParams).token;

  return (
    <div className="flex justify-center py-10">
      <ResetPasswordForm token={typeof token === 'string' ? token : null} />
    </div>
  );
}
