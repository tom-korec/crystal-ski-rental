'use client';

import { useTranslations } from 'next-intl';

import { QueryState } from '~/components/common/query-state';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { api } from '~/trpc/react';

import { type DeskReservation, DeskRow } from './desk-row';

const SECTIONS = ['pickupsDueToday', 'returnsDueToday', 'overduePickups', 'overdueReturns'] as const;

const parse = (params: URLSearchParams) => ({ storeId: params.get('store') ?? undefined });
const serialise = ({ storeId }: { storeId: string | undefined }) =>
  new URLSearchParams(storeId ? { store: storeId } : {});

/** Today's pickups and returns at one store, and everything overdue (FR-50). */
export function FrontDesk() {
  const t = useTranslations('frontDesk');
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const stores = api.store.list.useQuery();

  const storeId = stores.data?.find((store) => store.id === filters.storeId)?.id ?? stores.data?.[0]?.id ?? undefined;

  const desk = api.reservation.frontDesk.useQuery(
    { storeId: storeId ?? '' },
    { enabled: storeId !== undefined, refetchInterval: 60_000 },
  );

  return (
    <div className="flex flex-col gap-6">
      {stores.data && storeId ? (
        <Tabs value={storeId} onValueChange={(value: string) => apply({ storeId: value })}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList aria-label={t('stores')}>
              {stores.data.map((store) => (
                <TabsTrigger key={store.id} value={store.id} data-testid="store-tab">
                  {store.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      ) : (
        <Skeleton className="h-8 w-96 max-w-full" />
      )}

      <QueryState query={desk} skeleton={<DeskSkeleton />}>
        {(lists) => (
          <div className="flex flex-col gap-4">
            {SECTIONS.map((section) => (
              <DeskSection key={section} section={section} reservations={lists[section]} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

interface DeskSectionProps {
  section: (typeof SECTIONS)[number];
  reservations: DeskReservation[];
}

function DeskSection({ section, reservations }: DeskSectionProps) {
  const t = useTranslations('frontDesk');
  const overdue = section.startsWith('overdue');

  return (
    <Card className="gap-2" data-testid={`desk-${section}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <h2>{t(`sections.${section}.title`)}</h2>
          <Badge variant={overdue && reservations.length > 0 ? 'destructive' : 'secondary'} data-testid="section-count">
            {reservations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">{t(`sections.${section}.empty`)}</p>
        ) : (
          <ul className="divide-border divide-y">
            {reservations.map((reservation) => (
              <DeskRow key={reservation.id} reservation={reservation} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DeskSkeleton() {
  return (
    <LoadingRegion>
      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <Skeleton key={section} className="h-32 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
