'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { StoreDirectory } from '~/components/stores/store-directory';
import { Button } from '~/components/ui/button';
import { APP_HOME, SEARCH_PARAMS } from '~/lib/routes';

/** Where to pick up and return skis (FR-33), with a way to search the open store. */
export function CustomerStores() {
  const t = useTranslations('storeDirectory');

  return (
    <StoreDirectory
      title={t('title')}
      description={t('description')}
      tabsLabel={t('stores')}
      actions={(store) => (
        <Button
          nativeButton={false}
          render={<Link href={`${APP_HOME}?${SEARCH_PARAMS.store}=${store.id}`} />}
          data-testid="find-skis-at-store"
        >
          <SearchIcon aria-hidden />
          {t('findSkis')}
        </Button>
      )}
    />
  );
}
