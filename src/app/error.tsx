'use client';

import { RotateCcwIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PageMessage } from '~/components/common/page-message';
import { Button } from '~/components/ui/button';
import { LANDING } from '~/lib/routes';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches a throw while rendering any page below the root layout. The message itself is never shown:
 * production replaces it, and `digest` is the handle on the server-side log.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors');
  const tActions = useTranslations('common.actions');

  return (
    <PageMessage
      icon={<TriangleAlertIcon className="size-8" aria-hidden />}
      title={t('title')}
      description={t('description')}
      footnote={error.digest ? t('reference', { digest: error.digest }) : undefined}
      actions={
        <>
          <Button onClick={reset}>
            <RotateCcwIcon aria-hidden />
            {tActions('tryAgain')}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={LANDING} />}>
            {tActions('home')}
          </Button>
        </>
      }
    />
  );
}
