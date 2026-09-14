'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { StaffReservationRow } from '~/components/reservations/staff-reservation-row';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { pageCount } from '~/lib/pagination';
import { api } from '~/trpc/react';

interface SkiReservationsProps {
  skiId: string;
}

/** Every reservation of this ski, newest first, with the actions each one allows (FR-60). */
export function SkiReservations({ skiId }: SkiReservationsProps) {
  const t = useTranslations('skiDetail');
  const [page, setPage] = useState(1);
  const reservations = api.reservation.bySki.useQuery({ skiId, page });

  return (
    <Card className="gap-2" data-testid="ski-reservations">
      <CardHeader>
        <CardTitle>
          <h2>{t('reservations')}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <QueryState
          query={reservations}
          skeleton={
            <LoadingRegion>
              <Skeleton className="h-40 w-full" />
            </LoadingRegion>
          }
          isEmpty={(data) => data.total === 0}
          empty={<p className="text-muted-foreground py-3 text-sm">{t('noReservations')}</p>}
        >
          {(data) => (
            <>
              <ul className="divide-border divide-y">
                {data.items.map((reservation) => (
                  <StaffReservationRow
                    key={reservation.id}
                    reservation={reservation}
                    show={{ customer: true, status: true, rating: true }}
                  />
                ))}
              </ul>
              <Pagination page={data.page} pageCount={pageCount(data.total)} onPageChange={setPage} />
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}
