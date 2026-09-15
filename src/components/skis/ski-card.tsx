'use client';

import { MapPinIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { useFormatMoney } from '~/hooks/use-format-money';
import type { SkiGender, SkillLevel, SkiType } from '~/lib/catalog';
import type { RentalQuote } from '~/lib/pricing';

import { RatingSummary } from './rating-summary';
import { SkiBadges } from './ski-badges';

export interface SkiCardData {
  id: string;
  lengthCm: number;
  model: {
    name: string;
    type: SkiType;
    gender: SkiGender;
    skillLevel: SkillLevel;
    pricePerDay: string;
    avgRating: number | null;
    ratingCount: number;
    brand: { name: string };
  };
  store: { name: string };
}

interface SkiCardProps {
  ski: SkiCardData;
  /** The price for the searched dates, shown with its discount (FR-32). */
  quote?: RentalQuote;
  /** Staff only: customers never see inventory codes (BR-50). */
  inventoryCode?: string;
  status?: ReactNode;
  action?: ReactNode;
  /** Off in the customer search, where every result is from the store searched. */
  showStore?: boolean;
}

export function SkiCard({ ski, quote, inventoryCode, status, action, showStore = true }: SkiCardProps) {
  const t = useTranslations('skis');
  const formatMoney = useFormatMoney();
  const { model } = ski;

  return (
    <Card className="h-full gap-4" data-testid="ski-card" data-ski-id={ski.id}>
      <CardHeader>
        <CardTitle className="flex items-start justify-between gap-3">
          <span>
            {model.brand.name} {model.name}
          </span>
          {inventoryCode ? (
            <span className="text-muted-foreground font-mono text-xs font-normal" data-testid="inventory-code">
              {inventoryCode}
            </span>
          ) : null}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t('length', { length: ski.lengthCm })}</p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <SkiBadges type={model.type} gender={model.gender} skillLevel={model.skillLevel} />

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {showStore ? (
            <>
              <dt className="text-muted-foreground">{t('store')}</dt>
              <dd className="flex items-center gap-1">
                <MapPinIcon className="text-muted-foreground size-3.5" aria-hidden />
                {ski.store.name}
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t('ratingLabel')}</dt>
          <dd>
            <RatingSummary avgRating={model.avgRating} ratingCount={model.ratingCount} />
          </dd>
        </dl>

        {status ? <div className="flex flex-wrap gap-2">{status}</div> : null}

        <div className="border-border mt-auto flex flex-wrap items-end justify-between gap-3 border-t pt-3">
          <div className="flex flex-col gap-0.5">
            {quote ? (
              // The days and their discount are shown by the dates; the card carries only what this pair costs.
              <span className="text-xl font-semibold tabular-nums" data-testid="quote-total">
                {formatMoney(quote.totalPrice)}
              </span>
            ) : (
              <span className="text-lg font-semibold tabular-nums">
                {t('pricePerDay', { price: formatMoney(model.pricePerDay) })}
              </span>
            )}
          </div>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
