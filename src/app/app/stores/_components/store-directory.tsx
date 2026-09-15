'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { PageHeader } from '~/components/common/page-header';
import { QueryState } from '~/components/common/query-state';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { APP_HOME, SEARCH_PARAMS } from '~/lib/routes';
import { api } from '~/trpc/react';

const parse = (params: URLSearchParams) => ({ storeId: params.get(SEARCH_PARAMS.store) ?? undefined });
const serialise = ({ storeId }: { storeId: string | undefined }) =>
  new URLSearchParams(storeId ? { [SEARCH_PARAMS.store]: storeId } : {});

/** Every store with its address, contacts and opening hours, one tab each (FR-33). The open tab lives in the URL. */
export function StoreDirectory() {
  const t = useTranslations('storeDirectory');
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const stores = api.store.list.useQuery();

  const store = stores.data?.find((candidate) => candidate.id === filters.storeId) ?? stores.data?.[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} description={t('description')}>
        {stores.data && store ? (
          <Tabs value={store.id} onValueChange={(storeId: string) => apply({ storeId })}>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <TabsList aria-label={t('stores')}>
                {stores.data.map((candidate) => (
                  <TabsTrigger key={candidate.id} value={candidate.id} data-testid="store-tab">
                    {candidate.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        ) : (
          <Skeleton className="h-8 w-96 max-w-full" />
        )}
      </PageHeader>

      <QueryState query={stores} skeleton={<Skeleton className="h-64 w-full" />}>
        {() =>
          store ? (
            <Card>
              <CardContent className="flex flex-col gap-6">
                <StoreDetails store={store} />
                <Button
                  nativeButton={false}
                  render={<Link href={`${APP_HOME}?${SEARCH_PARAMS.store}=${store.id}`} />}
                  className="self-start"
                  data-testid="find-skis-at-store"
                >
                  <SearchIcon aria-hidden />
                  {t('findSkis')}
                </Button>
              </CardContent>
            </Card>
          ) : null
        }
      </QueryState>
    </div>
  );
}
