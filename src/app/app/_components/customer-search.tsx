'use client';

import { CheckIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DateRangeFilter } from '~/components/common/filters/date-range-filter';
import { SelectField } from '~/components/common/select-field';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import type { DateRange } from '~/lib/rental-range';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

interface CustomerSearchProps {
  storeId: string | undefined;
  range: DateRange | undefined;
  onSearch: (search: { storeId: string; range: DateRange }) => void;
  /** Before a search, a large step of its own; afterwards, a compact bar above the results. */
  variant: 'start' | 'bar';
}

/** Where and when: the question a customer answers before any skis are shown. */
export function CustomerSearch({ storeId, range, onSearch, variant }: CustomerSearchProps) {
  return variant === 'start' ? (
    <StartSearch storeId={storeId} range={range} onSearch={onSearch} />
  ) : (
    <SearchBar storeId={storeId} range={range} onSearch={onSearch} />
  );
}

type StepProps = Omit<CustomerSearchProps, 'variant'>;

function StartSearch({ storeId: initialStore, range: initialRange, onSearch }: StepProps) {
  const t = useTranslations('customerSearch');
  const stores = api.store.list.useQuery();
  const [storeId, setStoreId] = useState(initialStore);
  const [range, setRange] = useState(initialRange);

  return (
    <Card
      className="mx-auto w-full max-w-3xl shadow-xl shadow-black/10 dark:shadow-black/40"
      data-testid="customer-search"
    >
      <CardHeader>
        <CardTitle>
          <h2 className="text-xl">{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (storeId && range) onSearch({ storeId, range });
          }}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{t('store')}</legend>
            {stores.data ? (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('store')}>
                {stores.data.map((store) => {
                  const selected = store.id === storeId;
                  return (
                    <label
                      key={store.id}
                      className={cn(
                        'has-focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors has-focus-visible:ring-3',
                        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted',
                      )}
                      data-testid="store-option"
                    >
                      <input
                        type="radio"
                        name="store"
                        value={store.id}
                        checked={selected}
                        onChange={() => setStoreId(store.id)}
                        className="sr-only"
                      />
                      <MapPinIcon
                        className={cn('size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
                        aria-hidden
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="font-medium">{store.name}</span>
                        <span className="text-muted-foreground text-xs">{store.city}</span>
                      </span>
                      {selected ? <CheckIcon className="text-primary size-4" aria-hidden /> : null}
                    </label>
                  );
                })}
              </div>
            ) : (
              <Skeleton className="h-28 w-full" />
            )}
          </fieldset>

          <DateRangeFilter
            id="search-dates"
            label={t('dates')}
            placeholder={t('pickDates')}
            value={range}
            onChange={setRange}
          />

          <Button
            type="submit"
            size="lg"
            disabled={!storeId || !range}
            className="self-stretch sm:self-end"
            data-testid="show-skis"
          >
            <SearchIcon aria-hidden />
            {t('showSkis')}
          </Button>
          {!storeId || !range ? (
            <p className="text-muted-foreground -mt-4 text-xs sm:text-right" aria-live="polite">
              {!storeId && !range ? t('pickBoth') : !storeId ? t('pickStore') : t('pickDatesHint')}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function SearchBar({ storeId, range, onSearch }: StepProps) {
  const t = useTranslations('customerSearch');
  const stores = api.store.list.useQuery();

  if (!storeId || !range) return null;

  return (
    <section
      aria-label={t('title')}
      className="bg-card ring-foreground/10 grid gap-4 rounded-xl p-4 shadow-sm ring-1 sm:grid-cols-2"
      data-testid="customer-search-bar"
    >
      <SelectField
        id="search-store"
        label={t('store')}
        placeholder={t('store')}
        options={(stores.data ?? []).map((store) => ({ value: store.id, label: `${store.name}, ${store.city}` }))}
        disabled={stores.isPending}
        value={storeId}
        onChange={(next) => onSearch({ storeId: next, range })}
      />
      <DateRangeFilter
        id="search-dates"
        label={t('dates')}
        placeholder={t('pickDates')}
        value={range}
        onChange={(next) => onSearch({ storeId, range: next })}
      />
    </section>
  );
}
