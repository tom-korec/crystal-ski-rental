import { useTranslations } from 'next-intl';

import { env } from '~/env';

/** Tells visitors of the public demo that what they change is temporary. */
export function DemoBanner() {
  const t = useTranslations('demo');

  if (!env.NEXT_PUBLIC_DEMO_MODE) return null;

  return (
    <p
      className="bg-highlight text-highlight-foreground px-4 py-1.5 text-center text-xs font-medium"
      data-testid="demo-banner"
    >
      {t('banner')}
    </p>
  );
}
