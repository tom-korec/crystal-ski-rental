'use client';

import { CheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps, useState } from 'react';

import { SelectFilter } from '~/components/common/filters/select-filter';
import { LoadMore } from '~/components/common/load-more';
import { QueryState } from '~/components/common/query-state';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { SkiCard } from '~/components/skis/ski-card';
import { Button } from '~/components/ui/button';
import { useReservationCart } from '~/hooks/use-reservation-cart';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { addToCart, startCart } from '~/lib/reservation-cart';
import { SKI_SORTS, type SkiSearchFilters, type SkiSearchInput } from '~/lib/ski-schema';
import { api, type RouterOutputs } from '~/trpc/react';

import { type AddAttempt, type AddedSki, AddToReservationDialog } from './add-to-reservation-dialog';
import { CustomerSearch, type CustomerSearchValue } from './customer-search';
import { activeFilterCount } from './search-filters';
import { parseSearch, searchInput, serialiseSearch } from './search-params';

/**
 * The customer's ski search (FR-30…35). It starts by asking for a store and dates, and shows skis only
 * once both are picked. Everything lives in the URL.
 */
export function SkiSearch() {
  const { filters: state, apply } = useUrlFilters({ parse: parseSearch, serialise: serialiseSearch });
  const input = searchInput(state);

  const search = (value: CustomerSearchValue) => apply(value);
  const props = { storeId: state.storeId, range: state.range, filters: state.filters, onSearch: search };

  if (!input) return <CustomerSearch variant="start" {...props} />;

  return <SkiResults input={input} search={props} />;
}

type SearchResult = RouterOutputs['ski']['search']['items'][number];

interface SkiResultsProps {
  input: SkiSearchInput;
  search: Omit<ComponentProps<typeof CustomerSearch>, 'variant' | 'footer'>;
}

function SkiResults({ input, search }: SkiResultsProps) {
  const { filters } = search;
  const onFiltersChange = (next: SkiSearchFilters) =>
    search.onSearch({
      storeId: input.storeId,
      range: { startDate: input.startDate, endDate: input.endDate },
      filters: next,
    });
  const t = useTranslations('filters');
  const tSkis = useTranslations('skis');
  const { cart, setCart } = useReservationCart();
  const [attempt, setAttempt] = useState<AddAttempt | null>(null);

  const skis = api.ski.search.useInfiniteQuery(input, { getNextPageParam: (page) => page.nextCursor });
  const found = skis.data?.pages.flatMap((page) => page.items) ?? [];
  const total = skis.data?.pages[0]?.total ?? 0;

  const range = { startDate: input.startDate, endDate: input.endDate };
  const inCart = (skiId: string) =>
    cart?.startDate === range.startDate && cart.endDate === range.endDate && cart.skiIds.includes(skiId);

  /** Adds the first free pair of a result that is not in the reservation yet. */
  function reserve(result: SearchResult) {
    const skiId = result.skiIds.find((id) => !inCart(id)) ?? result.id;
    const ski = { ...result, id: skiId };
    const outcome = addToCart(cart, { id: ski.id, storeId: ski.store.id }, range);
    const next = outcome.kind === 'added' ? outcome.cart : cart;
    if (outcome.kind === 'added') setCart(outcome.cart);
    setAttempt({ ski, outcome, cart: next });
  }

  function startOver(ski: AddedSki) {
    const next = startCart({ id: ski.id, storeId: ski.store.id }, range);
    setCart(next);
    setAttempt({ ski, outcome: { kind: 'added', cart: next }, cart: next });
  }
  const isNarrowed = activeFilterCount(filters) > 0;

  return (
    <div className="flex flex-col gap-6">
      <CustomerSearch
        variant="bar"
        {...search}
        footer={
          <>
            <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="ski-count">
              {skis.data ? tSkis('count', { count: skis.data.pages[0]?.pairs ?? 0 }) : null}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <SelectFilter
                  id="sort"
                  label={t('sort')}
                  anyLabel={t('sortOptions.rating')}
                  options={SKI_SORTS.filter((sort) => sort !== 'rating').map((sort) => ({
                    value: sort,
                    label: t(`sortOptions.${sort}`),
                  }))}
                  value={filters.sort === 'rating' ? undefined : filters.sort}
                  onChange={(sort) =>
                    onFiltersChange({ ...filters, sort: (sort as SkiSearchFilters['sort'] | undefined) ?? 'rating' })
                  }
                />
              </div>
            </div>
          </>
        }
      />

      <QueryState
        query={skis}
        skeleton={<CardGridSkeleton />}
        isEmpty={() => total === 0}
        empty={
          <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center" data-testid="skis-empty">
            {(skis.data?.pages[0]?.closedDays.length ?? 0) > 0
              ? tSkis('emptyStoreClosed')
              : isNarrowed
                ? tSkis('emptyFiltered')
                : tSkis('emptyForDates')}
          </p>
        }
      >
        {() => (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {found.map((result) => (
                <li key={result.id}>
                  <SkiCard
                    showStore={false}
                    ski={result}
                    quote={result.quote}
                    status={
                      <span className="text-muted-foreground" data-testid="free-pairs">
                        {tSkis('freePairs', { count: result.skiIds.length })}
                      </span>
                    }
                    action={
                      <ReserveButton
                        reserved={result.skiIds.filter(inCart).length}
                        free={result.skiIds.length}
                        onReserve={() => reserve(result)}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
            <LoadMore
              hasMore={skis.hasNextPage}
              isLoading={skis.isFetchingNextPage}
              onLoadMore={() => void skis.fetchNextPage()}
              shown={found.length}
              total={total}
            />
          </>
        )}
      </QueryState>

      <AddToReservationDialog attempt={attempt} onClose={() => setAttempt(null)} onStartOver={startOver} />
    </div>
  );
}

interface ReserveButtonProps {
  /** Pairs of this result already in the reservation. */
  reserved: number;
  free: number;
  onReserve: () => void;
}

/** Reserve a pair, then more of the same while any are free (FR-33). */
function ReserveButton({ reserved, free, onReserve }: ReserveButtonProps) {
  const t = useTranslations('cart');

  if (reserved === 0) {
    return (
      <Button onClick={onReserve} data-testid="reserve">
        {t('reserve')}
      </Button>
    );
  }

  if (reserved >= free) {
    return (
      <Button variant="outline" disabled data-testid="all-reserved">
        <CheckIcon aria-hidden />
        {t('allReserved', { count: reserved })}
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={onReserve} data-testid="reserve-more">
      <CheckIcon aria-hidden />
      {t('reserveMore', { count: reserved })}
    </Button>
  );
}
