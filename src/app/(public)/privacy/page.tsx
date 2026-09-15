import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LegalDocument } from '~/components/legal/legal-document';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal');
  return { title: t('privacy.title') };
}

export default function Page() {
  return <LegalDocument document="privacy" />;
}
