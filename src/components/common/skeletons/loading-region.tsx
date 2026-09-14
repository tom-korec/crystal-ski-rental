'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

interface LoadingRegionProps {
  children: ReactNode;
}

/** Skeletons are decorative; this is what a screen reader hears while they show. */
export function LoadingRegion({ children }: LoadingRegionProps) {
  const t = useTranslations('common');

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t('loading')}</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}
