'use client';

import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LengthRangeFilter } from '~/components/common/filters/length-range-filter';
import { type FilterOption, SelectFilter } from '~/components/common/filters/select-filter';
import { Button } from '~/components/ui/button';
import { useFormatMoney } from '~/hooks/use-format-money';
import { GENDER_FILTERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import type { SkiSearchFilters } from '~/lib/ski-schema';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import { serialiseSearch } from './search-params';

const PRICE_STEPS = ['20', '25', '30', '35', '40', '45'];
const RATING_STEPS = [3, 4, 5];

/** How many narrowing filters are set, so a collapsed panel never hides a surprise. */
export function activeFilterCount(filters: SkiSearchFilters): number {
  return [
    filters.brandId,
    filters.modelId,
    filters.type,
    filters.gender,
    filters.skillLevel,
    // One slider, one filter.
    filters.minLengthCm ?? filters.maxLengthCm,
    filters.maxPricePerDay,
    filters.minRating,
  ].filter((value) => value !== undefined).length;
}

interface SearchFiltersProps {
  filters: SkiSearchFilters;
  onChange: (filters: SkiSearchFilters) => void;
  /**
   * The filters the results currently use. With it, changes stay a draft until the customer applies them;
   * without it (the first search step), every change goes straight to `onChange`.
   */
  applied?: SkiSearchFilters;
  onApply?: (filters: SkiSearchFilters) => void;
}

/** The filters as the URL writes them, sort aside, so a draft and the applied filters compare by value. */
export function filtersKey(filters: SkiSearchFilters): string {
  return serialiseSearch({ filters: { ...filters, sort: 'rating' } }).toString();
}

/**
 * Every narrowing filter of the ski search (FR-30). Collapsed until opened on the first step; always open
 * above results, where they are edited as a draft.
 */
export function SearchFilters({ filters, onChange, applied, onApply }: SearchFiltersProps) {
  const t = useTranslations('filters');
  const tCatalog = useTranslations('catalog');
  const formatMoney = useFormatMoney();
  const collapsible = applied === undefined;
  const [expanded, setExpanded] = useState(false);
  const open = !collapsible || expanded;

  const brands = api.brand.list.useQuery();
  const models = api.skiModel.list.useQuery({});

  const set = (patch: Partial<SkiSearchFilters>) => onChange({ ...filters, ...patch });
  const active = activeFilterCount(applied ?? filters);
  const isDraft = applied !== undefined && filtersKey(filters) !== filtersKey(applied);

  function apply(next: SkiSearchFilters) {
    // The sort is not a filter: it stays whatever the results use.
    onApply?.({ ...next, sort: applied?.sort ?? next.sort });
  }

  function clear() {
    const cleared = { sort: filters.sort };
    onChange(cleared);
    apply(cleared);
  }

  const modelOptions: FilterOption[] = (models.data ?? [])
    .filter((model) => !filters.brandId || model.brand.id === filters.brandId)
    .map((model) => ({ value: model.id, label: `${model.brand.name} ${model.name}` }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls="search-filters"
            onClick={() => setExpanded((current) => !current)}
            data-testid="more-filters"
          >
            <SlidersHorizontalIcon aria-hidden />
            {t('moreFilters', { count: active })}
            <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-sm font-medium" data-testid="active-filters">
            <SlidersHorizontalIcon className="size-4" aria-hidden />
            {t('filtersTitle', { count: active })}
          </p>
        )}
        {active > 0 ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear} data-testid="clear-filters">
            {t('clear')}
          </Button>
        ) : null}
      </div>

      <div id="search-filters" hidden={!open} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          onChange={(type) => set({ type: type as SkiSearchFilters['type'] })}
        />
        <SelectFilter
          id="filter-gender"
          label={t('gender')}
          anyLabel={t('anyGender')}
          options={GENDER_FILTERS.map((gender) => ({ value: gender, label: tCatalog(`gender.${gender}`) }))}
          value={filters.gender}
          onChange={(gender) => set({ gender: gender as SkiSearchFilters['gender'] })}
        />
        <SelectFilter
          id="filter-level"
          label={t('level')}
          anyLabel={t('anyLevel')}
          options={SKILL_LEVELS.map((level) => ({ value: level, label: tCatalog(`level.${level}`) }))}
          value={filters.skillLevel}
          onChange={(skillLevel) => set({ skillLevel: skillLevel as SkiSearchFilters['skillLevel'] })}
        />
        <LengthRangeFilter
          id="filter-length"
          label={t('length')}
          value={{ minLengthCm: filters.minLengthCm, maxLengthCm: filters.maxLengthCm }}
          onChange={set}
        />
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
        {onApply && applied ? (
          <div className="flex flex-wrap items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
            {isDraft ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(applied)}
                data-testid="discard-filters"
              >
                {t('discard')}
              </Button>
            ) : null}
            <Button type="button" disabled={!isDraft} onClick={() => apply(filters)} data-testid="apply-filters">
              {t('apply')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
