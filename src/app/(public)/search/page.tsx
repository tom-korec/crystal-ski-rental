import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { SkiSearch } from '~/components/skis/ski-search';
import { APP_HOME, SEARCH } from '~/lib/routes';
import { type PageSearchParams, redirectSignedInShopper } from '~/server/better-auth/guards';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('search');
  return { title: t('title'), alternates: { canonical: SEARCH } };
}

interface PublicSearchPageProps {
  searchParams: PageSearchParams;
}

/** The ski search for visitors (FR-37); an account is needed only to book. */
export default async function PublicSearchPage({ searchParams }: PublicSearchPageProps) {
  await redirectSignedInShopper(APP_HOME, searchParams);
  const t = await getTranslations('search');

  return (
    <>
      <PageHeader title={t('title')} visuallyHidden />
      <Suspense fallback={<CardGridSkeleton />}>
        <SkiSearch />
      </Suspense>
    </>
  );
}
