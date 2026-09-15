'use client';

import { CheckIcon, MapPinIcon, SearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

import { DateRangeFilter } from '~/components/common/filters/date-range-filter';
import { SelectField } from '~/components/common/select-field';
import { DiscountBadge } from '~/components/skis/discount-badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { toUtcDate, utcDaysBetween } from '~/lib/date';
import { discountPercentFor, MAX_RENTAL_DAYS, MIN_RENTAL_DAYS } from '~/lib/pricing';
import type { DateRange } from '~/lib/rental-range';
import type { SkiSearchFilters } from '~/lib/ski-schema';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

import { SearchFilters } from './search-filters';

export interface CustomerSearchValue {
  storeId: string;
  range: DateRange;
  filters: SkiSearchFilters;
}

interface CustomerSearchProps {
  storeId: string | undefined;
  range: DateRange | undefined;
  filters: SkiSearchFilters;
  onSearch: (search: CustomerSearchValue) => void;
  /** Before a search, a large step of its own; afterwards, a compact bar above the results. */
  variant: 'start' | 'bar';
  /** Bar only: what the search found, e.g. a count and the sort order. */
  footer?: ReactNode;
}

/**
 * Where, when and what: the store and dates a customer must pick before any skis are shown, and every
 * other filter, collapsed until opened.
 */
export function CustomerSearch({ variant, footer, ...props }: CustomerSearchProps) {
  return variant === 'start' ? <StartSearch {...props} /> : <SearchBar {...props} footer={footer} />;
}

type StepProps = Omit<CustomerSearchProps, 'variant' | 'footer'>;

function StartSearch({ storeId: initialStore, range: initialRange, filters: initialFilters, onSearch }: StepProps) {
  const t = useTranslations('customerSearch');
  const stores = api.store.list.useQuery();
  const [storeId, setStoreId] = useState(initialStore);
  const [range, setRange] = useState(initialRange);
  const [filters, setFilters] = useState(initialFilters);

  return (
    <Card className="w-full shadow-xl shadow-black/10 dark:shadow-black/40" data-testid="customer-search">
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
            if (storeId && range) onSearch({ storeId, range, filters });
          }}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-sm font-medium">{t('store')}</legend>
            {stores.data ? (
              <div
                className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-2"
                role="radiogroup"
                aria-label={t('store')}
              >
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
            adornment={range ? <RentalLength range={range} /> : null}
          />

          <SearchFilters filters={filters} onChange={setFilters} />

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

function SearchBar({ storeId, range, filters, onSearch, footer }: StepProps & { footer: ReactNode }) {
  const t = useTranslations('customerSearch');
  const stores = api.store.list.useQuery();

  if (!storeId || !range) return null;

  return (
    <section
      aria-label={t('title')}
      className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 shadow-sm ring-1"
      data-testid="customer-search-bar"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="search-store"
          label={t('store')}
          placeholder={t('store')}
          options={(stores.data ?? []).map((store) => ({ value: store.id, label: `${store.name}, ${store.city}` }))}
          disabled={stores.isPending}
          value={storeId}
          onChange={(next) => onSearch({ storeId: next, range, filters })}
        />
        <DateRangeFilter
          id="search-dates"
          label={t('dates')}
          placeholder={t('pickDates')}
          value={range}
          onChange={(next) => onSearch({ storeId, range: next, filters })}
          adornment={<RentalLength range={range} />}
        />
      </div>
      <SearchFilters filters={filters} onChange={(next) => onSearch({ storeId, range, filters: next })} />
      {footer ? (
        <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">{footer}</div>
      ) : null}
    </section>
  );
}

interface RentalLengthProps {
  range: DateRange;
}

/** How many days the dates are, and the discount that length earns (BR-3). */
function RentalLength({ range }: RentalLengthProps) {
  const t = useTranslations('customerSearch');
  const days = utcDaysBetween(toUtcDate(range.startDate), toUtcDate(range.endDate));

  return (
    <>
      <span className="text-muted-foreground text-xs" data-testid="rental-days">
        {t('days', { days })}
      </span>
      {days >= MIN_RENTAL_DAYS && days <= MAX_RENTAL_DAYS ? <DiscountBadge percent={discountPercentFor(days)} /> : null}
    </>
  );
}
