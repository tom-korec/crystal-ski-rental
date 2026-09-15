'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { Button } from '~/components/ui/button';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { PAGE_SIZE, pageCount, pageSchema } from '~/lib/pagination';
import { APP_HOME } from '~/lib/routes';
import { api } from '~/trpc/react';

import { ReservationCard } from './reservation-card';

const parse = (params: URLSearchParams) => ({ page: pageSchema.catch(1).parse(Number(params.get('page') ?? 1)) });
const serialise = ({ page }: { page: number }) => new URLSearchParams(page > 1 ? { page: String(page) } : {});

/** The customer's reservations, newest first (FR-40). */
export function MyReservations() {
  const t = useTranslations('reservations');
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const reservations = api.reservation.listMine.useQuery(filters);

  return (
    <QueryState
      query={reservations}
      skeleton={<CardGridSkeleton count={3} />}
      isEmpty={(data) => data.total === 0}
      empty={
        <div
          className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center"
          data-testid="reservations-empty"
        >
          <p className="text-muted-foreground">{t('empty')}</p>
          <Button nativeButton={false} render={<Link href={APP_HOME} />}>
            {t('findSkis')}
          </Button>
        </div>
      }
    >
      {(data) => (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {data.items.map((reservation) => (
              <li key={reservation.id}>
                <ReservationCard reservation={reservation} />
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            pageCount={pageCount(data.total, PAGE_SIZE)}
            onPageChange={(page) => apply({ page })}
          />
        </div>
      )}
    </QueryState>
  );
}
