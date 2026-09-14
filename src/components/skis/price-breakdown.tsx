'use client';

import { useTranslations } from 'next-intl';

import { useFormatMoney } from '~/hooks/use-format-money';
import { DISCOUNT_TIERS, quoteRental, type RentalQuote } from '~/lib/pricing';

interface PriceBreakdownProps {
  quote: RentalQuote;
}

/** Days × price, the discount and the total, and what a longer rental would save (FR-33, BR-3). */
export function PriceBreakdown({ quote }: PriceBreakdownProps) {
  const t = useTranslations('pricing');
  const formatMoney = useFormatMoney();
  const nextTier = DISCOUNT_TIERS.find((tier) => tier.percent > quote.discountPercent);
  const nextQuote = nextTier ? quoteRental(quote.pricePerDay, nextTier.fromDays) : null;

  return (
    <div className="flex flex-col gap-3 text-sm" data-testid="price-breakdown">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
        <dt className="text-muted-foreground">
          {t('daysTimesPrice', { days: quote.rentalDays, price: formatMoney(quote.pricePerDay) })}
        </dt>
        <dd className="text-right">{formatMoney(quote.subtotal)}</dd>
        {quote.discountPercent > 0 ? (
          <>
            <dt className="text-muted-foreground">{t('discount', { percent: quote.discountPercent })}</dt>
            <dd className="text-right">−{formatMoney(quote.discount)}</dd>
          </>
        ) : null}
        <dt className="border-border border-t pt-1.5 font-medium">{t('total')}</dt>
        <dd className="border-border border-t pt-1.5 text-right text-base font-semibold" data-testid="breakdown-total">
          {formatMoney(quote.totalPrice)}
        </dd>
      </dl>
      {nextTier && nextQuote ? (
        <p className="text-muted-foreground text-xs">
          {t('nextTier', {
            days: nextTier.fromDays,
            percent: nextTier.percent,
            total: formatMoney(nextQuote.totalPrice),
          })}
        </p>
      ) : null}
    </div>
  );
}
