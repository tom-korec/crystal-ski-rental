'use client';

import { ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { SearchFilter } from '~/components/common/filters/search-filter';
import { SelectFilter } from '~/components/common/filters/select-filter';
import { Pagination } from '~/components/common/pagination';
import { QueryState } from '~/components/common/query-state';
import { CustomerContact } from '~/components/reservations/customer-contact';
import { StatusBadge } from '~/components/reservations/status-badge';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { rentalPeriod } from '~/lib/date';
import { pageCount } from '~/lib/pagination';
import { RESERVATION_STATUSES, type ReservationStatus } from '~/lib/reservation-lifecycle';
import { reservationSearchSchema } from '~/lib/reservation-schema';
import { staffAccountRoute, staffReservationRoute } from '~/lib/routes';
import { api, type RouterOutputs } from '~/trpc/react';

type FoundReservation = RouterOutputs['reservation']['search']['items'][number];

interface SearchFilters {
  customer?: string;
  code?: string;
  storeId?: string;
  status?: ReservationStatus;
  page: number;
}

const PARAMS = { customer: 'q', code: 'code', storeId: 'store', status: 'status' } as const;

function parse(params: URLSearchParams): SearchFilters {
  const candidate = {
    ...Object.fromEntries(
      Object.entries(PARAMS).flatMap(([key, param]) => {
        const value = params.get(param);
        return value ? [[key, value]] : [];
      }),
    ),
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
  for (const [key, param] of Object.entries(PARAMS) as [keyof typeof PARAMS, string][]) {
    const value = filters[key];
    if (value) params.set(param, value);
  }
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** Every reservation, found by customer, code, store or status, newest first (FR-65). */
export function ReservationSearch() {
  const t = useTranslations('staffReservationSearch');
  const tFilters = useTranslations('filters');
  const { filters, apply } = useUrlFilters({ parse, serialise });
  const reservations = api.reservation.search.useQuery(filters);
  const isFiltered = Boolean(filters.customer ?? filters.code ?? filters.storeId ?? filters.status);

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
        skeleton={<Skeleton className="h-96 w-full" />}
        isEmpty={(data) => data.total === 0}
        empty={
          <p
            className="text-muted-foreground bg-card/80 rounded-xl border border-dashed p-8 text-center"
            data-testid="reservations-empty"
          >
            {isFiltered ? t('emptyFiltered') : t('empty')}
          </p>
        }
      >
        {(data) => (
          <>
            <div className="bg-card ring-foreground/10 overflow-x-auto rounded-xl shadow-sm ring-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead scope="col" className="ps-4">
                      {t('codeColumn')}
                    </TableHead>
                    <TableHead scope="col">{t('customer')}</TableHead>
                    <TableHead scope="col">{t('skis')}</TableHead>
                    <TableHead scope="col">{t('store')}</TableHead>
                    <TableHead scope="col">{t('dates')}</TableHead>
                    <TableHead scope="col" className="text-right">
                      {t('total')}
                    </TableHead>
                    <TableHead scope="col">{t('status')}</TableHead>
                    <TableHead scope="col" className="pe-4">
                      <span className="sr-only">{t('actions')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((reservation) => (
                    <ReservationRow key={reservation.id} reservation={reservation} />
                  ))}
                </TableBody>
              </Table>
            </div>
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

interface ReservationRowProps {
  reservation: FoundReservation;
}

function ReservationRow({ reservation }: ReservationRowProps) {
  const t = useTranslations('staffReservationSearch');
  const formatMoney = useFormatMoney();
  const formatDateRange = useFormatDateRange();
  const { items, user, store } = reservation;
  const detail = staffReservationRoute(reservation.id);
  const [first, ...others] = items;

  return (
    <TableRow data-testid="reservation-row" data-reservation-id={reservation.id} data-status={reservation.status}>
      <TableCell className="ps-4">
        <Link
          href={detail}
          className="bg-secondary text-secondary-foreground rounded px-2 py-1 font-mono text-xs font-medium tracking-wider underline-offset-2 hover:underline"
          data-testid="reservation-code"
        >
          {reservation.code}
        </Link>
      </TableCell>
      <TableCell className="max-w-56">
        <CustomerContact name={user.name} email={user.email} href={staffAccountRoute(user.id)} />
      </TableCell>
      <TableCell className="max-w-64">
        {first ? (
          <span className="flex flex-col">
            <span className="truncate">
              {first.ski.model.brand.name} {first.ski.model.name}
            </span>
            <span className="text-muted-foreground text-xs">
              {others.length > 0
                ? t('morePairs', { count: others.length })
                : t('length', { length: first.ski.lengthCm })}
            </span>
          </span>
        ) : null}
      </TableCell>
      <TableCell className="whitespace-nowrap">{store.name}</TableCell>
      <TableCell className="whitespace-nowrap">
        <span className="flex flex-col">
          <span>{formatDateRange(reservation.startDate, rentalPeriod(reservation).lastDay)}</span>
          <span className="text-muted-foreground text-xs">{t('days', { days: reservation.rentalDays })}</span>
        </span>
      </TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
        {formatMoney(reservation.totalPrice)}
      </TableCell>
      <TableCell>
        <StatusBadge status={reservation.status} audience="staff" />
      </TableCell>
      <TableCell className="pe-4 text-right">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={detail} />}
          data-testid="reservation-details-link"
        >
          {t('details')}
          <ChevronRightIcon aria-hidden />
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface SearchFormProps {
  applied: SearchFilters;
  onApply: (filters: Omit<SearchFilters, 'page'>) => void;
}

/** A draft until searched, like the other staff filters. */
function SearchForm({ applied, onApply }: SearchFormProps) {
  const t = useTranslations('staffReservationSearch');
  const tFilters = useTranslations('filters');
  const tStatus = useTranslations('reservations');
  const stores = api.store.list.useQuery();
  const [draft, setDraft] = useState<Omit<SearchFilters, 'page'>>({
    customer: applied.customer,
    code: applied.code,
    storeId: applied.storeId,
    status: applied.status,
  });
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));
  const isDraft = serialise({ ...draft, page: 1 }).toString() !== serialise({ ...applied, page: 1 }).toString();

  return (
    <form
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <SearchFilter
        id="search-customer"
        label={t('customer')}
        placeholder={t('customerPlaceholder')}
        value={draft.customer}
        onChange={(customer) => set({ customer })}
        debounceMs={0}
      />
      <SearchFilter
        id="search-code"
        label={t('code')}
        placeholder={t('codePlaceholder')}
        value={draft.code}
        onChange={(code) => set({ code })}
        debounceMs={0}
      />
      <SelectFilter
        id="search-store"
        label={t('store')}
        anyLabel={tFilters('anyStore')}
        options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
        disabled={stores.isPending}
        value={draft.storeId}
        onChange={(storeId) => set({ storeId })}
      />
      <SelectFilter
        id="search-status"
        label={t('status')}
        anyLabel={t('anyStatus')}
        options={RESERVATION_STATUSES.map((status) => ({ value: status, label: tStatus(`staffStatus.${status}`) }))}
        value={draft.status}
        onChange={(status) => set({ status: status as ReservationStatus | undefined })}
      />
      <Button type="submit" disabled={!isDraft} className="sm:col-span-2 lg:col-span-1" data-testid="submit-search">
        {t('search')}
      </Button>
    </form>
  );
}
