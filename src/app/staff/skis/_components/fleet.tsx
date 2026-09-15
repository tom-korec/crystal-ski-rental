'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { LengthRangeFilter } from '~/components/common/filters/length-range-filter';
import { type FilterOption, SelectFilter } from '~/components/common/filters/select-filter';
import { SearchFilter } from '~/components/common/filters/search-filter';
import { LoadMore } from '~/components/common/load-more';
import { QueryState } from '~/components/common/query-state';
import { CardGridSkeleton } from '~/components/common/skeletons/card-grid-skeleton';
import { SkiCard } from '~/components/skis/ski-card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { useStaffActor } from '~/components/layout/staff-actor';
import { useUrlFilters } from '~/hooks/use-url-filters';
import { isAdmin } from '~/lib/roles';
import { GENDER_FILTERS, SKI_TYPES, SKILL_LEVELS } from '~/lib/catalog';
import { staffSkiRoute } from '~/lib/routes';
import { api } from '~/trpc/react';

import { AddSkiDialog } from './add-ski-dialog';
import { type FleetFilters, parseFleet, serialiseFleet } from './fleet-params';

/** The whole fleet for staff, including skis out of rental (FR-20). */
export function Fleet() {
  const t = useTranslations('fleet');
  const tFilters = useTranslations('filters');
  const { filters, apply } = useUrlFilters({ parse: parseFleet, serialise: serialiseFleet });
  const actor = useStaffActor();

  const skis = api.ski.list.useInfiniteQuery(filters, { getNextPageParam: (page) => page.nextCursor });

  const found = skis.data?.pages.flatMap((page) => page.items) ?? [];
  const total = skis.data?.pages[0]?.total ?? 0;
  const isFiltered = Object.values(filters).some((value) => value !== undefined);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label={tFilters('title')}
        className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 shadow-sm ring-1"
      >
        {/* Keyed by the applied filters, so the draft starts over whenever the list changes under it. */}
        <FleetFilterForm key={serialiseFleet(filters).toString()} applied={filters} onApply={apply} />
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-muted-foreground text-sm" aria-live="polite" data-testid="fleet-count">
            {skis.data ? t('count', { count: total }) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isFiltered ? (
              <Button variant="ghost" size="sm" onClick={() => apply({})}>
                {tFilters('clear')}
              </Button>
            ) : null}
            {isAdmin(actor.role) || actor.storeId ? <AddSkiDialog /> : null}
          </div>
        </div>
      </section>

      <QueryState
        query={skis}
        skeleton={<CardGridSkeleton />}
        isEmpty={() => total === 0}
        empty={
          <p
            className="text-muted-foreground rounded-xl border border-dashed p-8 text-center"
            data-testid="fleet-empty"
          >
            {isFiltered ? t('emptyFiltered') : t('empty')}
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
                    inventoryCode={ski.inventoryCode}
                    status={ski.isAvailable ? null : <Badge variant="outline">{t('outOfRental')}</Badge>}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={staffSkiRoute(ski.id)} />}
                        data-testid="open-ski"
                      >
                        {t('details')}
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
    </div>
  );
}

interface FleetFilterFormProps {
  applied: FleetFilters;
  onApply: (filters: FleetFilters) => void;
}

/** The fleet filters, edited as a draft and applied together, so the list does not reload on every change. */
function FleetFilterForm({ applied, onApply }: FleetFilterFormProps) {
  const t = useTranslations('fleet');
  const tFilters = useTranslations('filters');
  const tCatalog = useTranslations('catalog');
  const [draft, setDraft] = useState(applied);

  const stores = api.store.list.useQuery();
  const brands = api.brand.list.useQuery();
  const models = api.skiModel.list.useQuery({});

  const set = (patch: Partial<FleetFilters>) => setDraft((current) => ({ ...current, ...patch }));
  const isDraft = serialiseFleet(draft).toString() !== serialiseFleet(applied).toString();

  const modelOptions: FilterOption[] = (models.data ?? [])
    .filter((model) => !draft.brandId || model.brand.id === draft.brandId)
    .map((model) => ({ value: model.id, label: `${model.brand.name} ${model.name}` }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SearchFilter
          id="filter-code"
          label={t('inventoryCode')}
          placeholder={t('inventoryCodePlaceholder')}
          value={draft.inventoryCode}
          onChange={(inventoryCode) => set({ inventoryCode })}
          debounceMs={0}
        />
        <SelectFilter
          id="filter-store"
          label={tFilters('store')}
          anyLabel={tFilters('anyStore')}
          options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
          disabled={stores.isPending}
          value={draft.storeId}
          onChange={(storeId) => set({ storeId })}
        />
        <SelectFilter
          id="filter-brand"
          label={tFilters('brand')}
          anyLabel={tFilters('anyBrand')}
          options={(brands.data ?? []).map((brand) => ({ value: brand.id, label: brand.name }))}
          disabled={brands.isPending}
          value={draft.brandId}
          onChange={(brandId) => set({ brandId, modelId: undefined })}
        />
        <SelectFilter
          id="filter-model"
          label={tFilters('model')}
          anyLabel={tFilters('anyModel')}
          options={modelOptions}
          disabled={models.isPending}
          value={draft.modelId}
          onChange={(modelId) => set({ modelId })}
        />
        <SelectFilter
          id="filter-type"
          label={tFilters('type')}
          anyLabel={tFilters('anyType')}
          options={SKI_TYPES.map((type) => ({ value: type, label: tCatalog(`type.${type}`) }))}
          value={draft.type}
          onChange={(type) => set({ type: type as FleetFilters['type'] })}
        />
        <SelectFilter
          id="filter-gender"
          label={tFilters('gender')}
          anyLabel={tFilters('anyGender')}
          options={GENDER_FILTERS.map((gender) => ({ value: gender, label: tCatalog(`gender.${gender}`) }))}
          value={draft.gender}
          onChange={(gender) => set({ gender: gender as FleetFilters['gender'] })}
        />
        <SelectFilter
          id="filter-level"
          label={tFilters('level')}
          anyLabel={tFilters('anyLevel')}
          options={SKILL_LEVELS.map((level) => ({ value: level, label: tCatalog(`level.${level}`) }))}
          value={draft.skillLevel}
          onChange={(skillLevel) => set({ skillLevel: skillLevel as FleetFilters['skillLevel'] })}
        />
        <LengthRangeFilter
          id="filter-length"
          label={tFilters('length')}
          value={{ minLengthCm: draft.minLengthCm, maxLengthCm: draft.maxLengthCm }}
          onChange={set}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {isDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDraft(applied)}
            data-testid="discard-filters"
          >
            {tFilters('discard')}
          </Button>
        ) : null}
        <Button type="submit" disabled={!isDraft} data-testid="apply-filters">
          {tFilters('apply')}
        </Button>
      </div>
    </form>
  );
}
