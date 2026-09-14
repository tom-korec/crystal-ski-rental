'use client';

import { SlidersHorizontalIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DateRangeFilter } from '~/components/common/filters/date-range-filter';
import { type FilterOption, SelectFilter } from '~/components/common/filters/select-filter';
import { LoadMore } from '~/components/common/load-more';
import { QueryState } from '~/components/common/query-state';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { SkiCard } from '~/components/skis/ski-card';
import { Button } from '~/components/ui/button';
import { useFormatMoney } from '~/hooks/use-format-money';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import { SKI_SORTS } from '~/lib/ski-schema';
import { api } from '~/trpc/react';

import { type ReserveSelection, ReserveSkiDialog } from './reserve-ski-dialog';
import { parseSearch, type SearchFilters, serialiseSearch } from './search-params';

const LENGTH_STEPS = [100, 120, 140, 150, 160, 170, 180, 190];
const PRICE_STEPS = ['20', '25', '30', '35', '40', '45'];
const RATING_STEPS = [3, 4, 5];

/** The customer's ski search (FR-30…35). Every filter lives in the URL. */
export function SkiSearch() {
  const t = useTranslations('filters');
  const tCatalog = useTranslations('catalog');
  const tSkis = useTranslations('skis');
  const formatMoney = useFormatMoney();
  const { filters, apply } = useUrlFilters({ parse: parseSearch, serialise: serialiseSearch });
  const [selection, setSelection] = useState<ReserveSelection | null>(null);
  const [moreFilters, setMoreFilters] = useState(false);

  const stores = api.store.list.useQuery();
  const brands = api.brand.list.useQuery();
  const models = api.skiModel.list.useQuery({});

  const skis = api.ski.search.useInfiniteQuery(filters, { getNextPageParam: (page) => page.nextCursor });
  const found = skis.data?.pages.flatMap((page) => page.items) ?? [];
  const total = skis.data?.pages[0]?.total ?? 0;

  const set = (patch: Partial<SearchFilters>) => apply({ ...filters, ...patch });
  const range = { startDate: filters.startDate, endDate: filters.endDate };
  const isNarrowed = hasNarrowingFilter(filters);

  const modelOptions: FilterOption[] = (models.data ?? [])
    .filter((model) => !filters.brandId || model.brand.id === filters.brandId)
    .map((model) => ({ value: model.id, label: `${model.brand.name} ${model.name}` }));

  return (
    <div className="flex flex-col gap-6">
      <section aria-label={t('title')} className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 ring-1">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateRangeFilter
            id="filter-dates"
            label={t('dates')}
            value={range}
            onChange={(next) => set({ ...next, cursor: undefined })}
          />
          <SelectFilter
            id="filter-store"
            label={t('store')}
            anyLabel={t('anyStore')}
            options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
            disabled={stores.isPending}
            value={filters.storeId}
            onChange={(storeId) => set({ storeId })}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:hidden"
          aria-expanded={moreFilters}
          aria-controls="more-filters"
          onClick={() => setMoreFilters((open) => !open)}
          data-testid="more-filters"
        >
          <SlidersHorizontalIcon aria-hidden />
          {t('moreFilters', { count: secondaryFilterCount(filters) })}
        </Button>

        <div
          id="more-filters"
          className={
            moreFilters
              ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'
              : 'hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4'
          }
        >
          <SelectFilter
            id="filter-brand"
            label={t('brand')}
            anyLabel={t('anyBrand')}
            options={(brands.data ?? []).map((brand) => ({ value: brand.id, label: brand.name }))}
            disabled={brands.isPending}
            value={filters.brandId}
            // A model from another brand would silently empty the results.
            onChange={(brandId) => set({ brandId, modelId: undefined })}
          />
          <SelectFilter
            id="filter-model"
            label={t('model')}
            anyLabel={t('anyModel')}
            options={modelOptions}
            disabled={models.isPending}
            value={filters.modelId}
            onChange={(modelId) => set({ modelId })}
          />
          <SelectFilter
            id="filter-type"
            label={t('type')}
            anyLabel={t('anyType')}
            options={SKI_TYPES.map((type) => ({ value: type, label: tCatalog(`type.${type}`) }))}
            value={filters.type}
            onChange={(type) => set({ type: type as SearchFilters['type'] })}
          />
          <SelectFilter
            id="filter-gender"
            label={t('gender')}
            anyLabel={t('anyGender')}
            options={SKI_GENDERS.map((gender) => ({ value: gender, label: tCatalog(`gender.${gender}`) }))}
            value={filters.gender}
            onChange={(gender) => set({ gender: gender as SearchFilters['gender'] })}
          />
          <SelectFilter
            id="filter-level"
            label={t('level')}
            anyLabel={t('anyLevel')}
            options={SKILL_LEVELS.map((level) => ({ value: level, label: tCatalog(`level.${level}`) }))}
            value={filters.skillLevel}
            onChange={(skillLevel) => set({ skillLevel: skillLevel as SearchFilters['skillLevel'] })}
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectFilter
              id="filter-min-length"
              label={t('minLength')}
              anyLabel={t('any')}
              options={LENGTH_STEPS.map((length) => ({ value: String(length), label: t('cm', { length }) }))}
              value={filters.minLengthCm?.toString()}
              onChange={(value) => set({ minLengthCm: value ? Number(value) : undefined })}
            />
            <SelectFilter
              id="filter-max-length"
              label={t('maxLength')}
              anyLabel={t('any')}
              options={LENGTH_STEPS.map((length) => ({ value: String(length), label: t('cm', { length }) }))}
              value={filters.maxLengthCm?.toString()}
              onChange={(value) => set({ maxLengthCm: value ? Number(value) : undefined })}
            />
          </div>
          <SelectFilter
            id="filter-max-price"
            label={t('maxPrice')}
            anyLabel={t('anyPrice')}
            options={PRICE_STEPS.map((price) => ({ value: price, label: t('upTo', { price: formatMoney(price) }) }))}
            value={filters.maxPricePerDay}
            onChange={(maxPricePerDay) => set({ maxPricePerDay })}
          />
          <SelectFilter
            id="filter-rating"
            label={t('rating')}
            anyLabel={t('anyRating')}
            options={RATING_STEPS.map((score) => ({ value: String(score), label: t('ratingAtLeast', { score }) }))}
            value={filters.minRating?.toString()}
            onChange={(value) => set({ minRating: value ? Number(value) : undefined })}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="ski-count">
          {skis.data ? tSkis('count', { count: total }) : null}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          {isNarrowed ? (
            <Button variant="ghost" size="sm" onClick={() => apply({ ...range, sort: filters.sort })}>
              {t('clear')}
            </Button>
          ) : null}
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
              onChange={(sort) => set({ sort: (sort as SearchFilters['sort'] | undefined) ?? 'rating' })}
            />
          </div>
        </div>
      </div>

      <QueryState
        query={skis}
        skeleton={<CardGridSkeleton />}
        isEmpty={() => total === 0}
        empty={
          <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center" data-testid="skis-empty">
            {isNarrowed ? tSkis('emptyFiltered') : tSkis('emptyForDates')}
          </p>
        }
      >
        {() => (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {found.map((ski) => (
                <li key={ski.id}>
                  <SkiCard
                    ski={ski}
                    quote={ski.quote}
                    action={
                      <Button onClick={() => setSelection({ ski, quote: ski.quote })} data-testid="reserve">
                        {tSkis('reserve')}
                      </Button>
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

      <ReserveSkiDialog selection={selection} range={range} onClose={() => setSelection(null)} />
    </div>
  );
}

/** Filters tucked behind "More filters" on small screens, counted so a hidden filter is never a surprise. */
function secondaryFilterCount(filters: SearchFilters): number {
  return [
    filters.brandId,
    filters.modelId,
    filters.type,
    filters.gender,
    filters.skillLevel,
    filters.minLengthCm,
    filters.maxLengthCm,
    filters.maxPricePerDay,
    filters.minRating,
  ].filter((value) => value !== undefined).length;
}

function hasNarrowingFilter(filters: SearchFilters): boolean {
  return [
    filters.storeId,
    filters.brandId,
    filters.modelId,
    filters.type,
    filters.gender,
    filters.skillLevel,
    filters.minLengthCm,
    filters.maxLengthCm,
    filters.maxPricePerDay,
    filters.minRating,
  ].some((value) => value !== undefined);
}
