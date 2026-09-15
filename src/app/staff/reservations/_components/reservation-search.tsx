'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchFilter } from '~/components/common/filters/search-filter';
import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { StaffReservationRow } from '~/components/reservations/staff-reservation-row';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { pageCount } from '~/lib/pagination';
import { reservationSearchSchema } from '~/lib/reservation-schema';
import { api } from '~/trpc/react';

interface SearchFilters {
  customer?: string;
  code?: string;
  page: number;
}

function parse(params: URLSearchParams): SearchFilters {
  const candidate = {
    customer: params.get('q') ?? undefined,
    code: params.get('code') ?? undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
  };
  const parsed = reservationSearchSchema.safeParse(candidate);
  if (parsed.success) return parsed.data;

  const invalid = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  return reservationSearchSchema.parse(
    Object.fromEntries(Object.entries(candidate).filter(([key]) => !invalid.has(key))),
  );
}

function serialise(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.customer) params.set('q', filters.customer);
  if (filters.code) params.set('code', filters.code);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** Every reservation, found by customer or by code, newest first (FR-65). */
export function ReservationSearch() {
  const t = useTranslations('staffReservationSearch');
  const tFilters = useTranslations('filters');
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const reservations = api.reservation.search.useQuery(filters);
  const isFiltered = Boolean(filters.customer ?? filters.code);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label={tFilters('title')}
        className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 shadow-sm ring-1"
      >
        {/* Keyed by the applied search, so the fields follow Back and "Clear". */}
        <SearchForm
          key={serialise(filters).toString()}
          applied={filters}
          onApply={(next) => apply({ ...next, page: 1 })}
        />
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="reservation-count">
            {reservations.data ? t('count', { count: reservations.data.total }) : null}
          </p>
          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={() => apply({ page: 1 })} data-testid="clear-search">
              {tFilters('clear')}
            </Button>
          ) : null}
        </div>
      </section>

      <QueryState
        query={reservations}
        skeleton={<Skeleton className="h-64 w-full" />}
        isEmpty={(data) => data.total === 0}
        empty={
          <p
            className="text-muted-foreground rounded-xl border border-dashed p-8 text-center"
            data-testid="reservations-empty"
          >
            {isFiltered ? t('emptyFiltered') : t('empty')}
          </p>
        }
      >
        {(data) => (
          <>
            <Card className="py-2">
              <CardContent>
                <ul className="divide-border flex flex-col divide-y">
                  {data.items.map((reservation) => (
                    <StaffReservationRow
                      key={reservation.id}
                      reservation={reservation}
                      show={{ customer: true, skis: true, status: true }}
                    />
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Pagination
              page={data.page}
              pageCount={pageCount(data.total)}
              onPageChange={(page) => apply({ ...filters, page })}
            />
          </>
        )}
      </QueryState>
    </div>
  );
}

interface SearchFormProps {
  applied: SearchFilters;
  onApply: (filters: Omit<SearchFilters, 'page'>) => void;
}

/** Both fields are a draft until searched, like the other staff filters. */
function SearchForm({ applied, onApply }: SearchFormProps) {
  const t = useTranslations('staffReservationSearch');
  const [customer, setCustomer] = useState(applied.customer);
  const [code, setCode] = useState(applied.code);
  const isDraft = customer !== applied.customer || code !== applied.code;

  return (
    <form
      className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ customer, code });
      }}
    >
      <SearchFilter
        id="search-customer"
        label={t('customer')}
        placeholder={t('customerPlaceholder')}
        value={customer}
        onChange={setCustomer}
        debounceMs={0}
      />
      <SearchFilter
        id="search-code"
        label={t('code')}
        placeholder={t('codePlaceholder')}
        value={code}
        onChange={setCode}
        debounceMs={0}
      />
      <Button type="submit" disabled={!isDraft} data-testid="submit-search">
        {t('search')}
      </Button>
    </form>
  );
}
