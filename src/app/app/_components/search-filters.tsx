'use client';

import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { type FilterOption, SelectFilter } from '~/components/common/filters/select-filter';
import { Button } from '~/components/ui/button';
import { useFormatMoney } from '~/hooks/use-format-money';
import { SKI_GENDERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import type { SkiSearchFilters } from '~/lib/ski-schema';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

const LENGTH_STEPS = [100, 120, 140, 150, 160, 170, 180, 190];
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
    filters.minLengthCm,
    filters.maxLengthCm,
    filters.maxPricePerDay,
    filters.minRating,
  ].filter((value) => value !== undefined).length;
}

interface SearchFiltersProps {
  filters: SkiSearchFilters;
  onChange: (filters: SkiSearchFilters) => void;
}

/** Every narrowing filter of the ski search (FR-30), collapsed until the customer opens them. */
export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const t = useTranslations('filters');
  const tCatalog = useTranslations('catalog');
  const formatMoney = useFormatMoney();
  const [open, setOpen] = useState(false);

  const brands = api.brand.list.useQuery();
  const models = api.skiModel.list.useQuery({});

  const set = (patch: Partial<SkiSearchFilters>) => onChange({ ...filters, ...patch });
  const active = activeFilterCount(filters);

  const modelOptions: FilterOption[] = (models.data ?? [])
    .filter((model) => !filters.brandId || model.brand.id === filters.brandId)
    .map((model) => ({ value: model.id, label: `${model.brand.name} ${model.name}` }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls="search-filters"
          onClick={() => setOpen((current) => !current)}
          data-testid="more-filters"
        >
          <SlidersHorizontalIcon aria-hidden />
          {t('moreFilters', { count: active })}
          <ChevronDownIcon className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
        </Button>
        {active > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ sort: filters.sort })}
            data-testid="clear-filters"
          >
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
          options={SKI_GENDERS.map((gender) => ({ value: gender, label: tCatalog(`gender.${gender}`) }))}
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
    </div>
  );
}
