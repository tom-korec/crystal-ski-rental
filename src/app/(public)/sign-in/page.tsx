import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuthPanel } from '~/components/layout/auth-panel';
import { DemoAccounts } from '~/components/layout/demo-accounts';
import { redirectIfSignedIn } from '~/server/better-auth/guards';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('signInTitle') };
}

/** Signing in and signing up (FR-1, FR-2), off the landing page so visitors can shop first (FR-37). */
export default async function SignInPage() {
  await redirectIfSignedIn();

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <AuthPanel />
      <DemoAccounts />
    </div>
  );
}
