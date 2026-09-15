'use client';

import type { ReactNode } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { QueryState } from '~/components/common/query-state';
import { StoreDetails } from '~/components/stores/store-details';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { SEARCH_PARAMS } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';

export type DirectoryStore = RouterOutputs['store']['list'][number];

const parse = (params: URLSearchParams) => ({ storeId: params.get(SEARCH_PARAMS.store) ?? undefined });
const serialise = ({ storeId }: { storeId: string | undefined }) =>
  new URLSearchParams(storeId ? { [SEARCH_PARAMS.store]: storeId } : {});

interface StoreDirectoryProps {
  title: string;
  description: string;
  /** Labels the tab list for screen readers. */
  tabsLabel: string;
  headerActions?: ReactNode;
  /** What can be done with the open store, under its details. */
  actions?: (store: DirectoryStore) => ReactNode;
  /** More about the open store, below its card. */
  below?: (store: DirectoryStore) => ReactNode;
}

/** Every store with its address, contacts and opening hours, one tab each (FR-12, FR-33). The open tab lives in the URL. */
export function StoreDirectory({ title, description, tabsLabel, headerActions, actions, below }: StoreDirectoryProps) {
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const stores = api.store.list.useQuery();

  const store = stores.data?.find((candidate) => candidate.id === filters.storeId) ?? stores.data?.[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} actions={headerActions}>
        {stores.data && store ? (
          <Tabs value={store.id} onValueChange={(storeId: string) => apply({ storeId })}>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <TabsList aria-label={tabsLabel}>
                {stores.data.map((candidate) => (
                  <TabsTrigger key={candidate.id} value={candidate.id} data-testid="store-tab">
                    {candidate.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        ) : stores.isPending ? (
          <Skeleton className="h-8 w-96 max-w-full" />
        ) : null}
      </PageHeader>

      <QueryState query={stores} skeleton={<Skeleton className="h-64 w-full" />}>
        {() =>
          store ? (
            <>
              <Card>
                <CardContent className="flex flex-col gap-6">
                  <StoreDetails store={store} />
                  {actions ? <div className="flex flex-wrap items-center gap-2">{actions(store)}</div> : null}
                </CardContent>
              </Card>
              {below?.(store)}
            </>
          ) : null
        }
      </QueryState>
    </div>
  );
}
