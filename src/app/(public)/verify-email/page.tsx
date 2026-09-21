import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { PageSearchParams } from '~/server/better-auth/guards';
import { ConfirmEmailResult } from './_components/confirm-email-result';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('confirmTitle') };
}

interface VerifyEmailPageProps {
  searchParams: PageSearchParams;
}

/** Where Better Auth's confirmation link lands: a spent or expired token arrives as `?error=` (FR-9). */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const confirmed = !(await searchParams).error;

  return (
    <div className="flex justify-center py-10">
      <ConfirmEmailResult confirmed={confirmed} />
    </div>
  );
}
