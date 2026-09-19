import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ForgotPasswordForm } from './_components/forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('forgotTitle') };
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex justify-center py-10">
      <ForgotPasswordForm />
    </div>
  );
}
