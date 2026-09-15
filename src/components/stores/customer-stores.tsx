'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useShopRoutes } from '~/components/layout/shop-routes';
import { StoreDirectory } from '~/components/stores/store-directory';
import { Button } from '~/components/ui/button';
import { SEARCH_PARAMS } from '~/lib/routes';

/** Where to pick up and return skis (FR-33), with a way to search the open store. */
export function CustomerStores() {
  const t = useTranslations('storeDirectory');
  const routes = useShopRoutes();

  return (
    <StoreDirectory
      title={t('title')}
      description={t('description')}
      tabsLabel={t('stores')}
      actions={(store) => (
        <Button
          nativeButton={false}
          render={<Link href={`${routes.search}?${SEARCH_PARAMS.store}=${store.id}`} />}
          data-testid="find-skis-at-store"
        >
          <SearchIcon aria-hidden />
          {t('findSkis')}
        </Button>
      )}
    />
  );
}
