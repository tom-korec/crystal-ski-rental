'use client';

import { useTranslations } from 'next-intl';

import { DiscountBadge } from '~/components/skis/discount-badge';
import { Skeleton } from '~/components/ui/skeleton';
import { useFormatMoney } from '~/hooks/use-format-money';
import type { RouterOutputs } from '~/trpc/react';

interface CartTotalsProps {
  quote: RouterOutputs['reservation']['quote'] | undefined;
}

/** What the reservation costs: pairs × days, the discount for its length, and the total (BR-3). */
export function CartTotals({ quote }: CartTotalsProps) {
  const t = useTranslations('checkout');
  const formatMoney = useFormatMoney();

  if (!quote?.totals) return <Skeleton className="h-16 w-full" />;

  const { totals } = quote;

  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 tabular-nums">
      <dt className="text-muted-foreground">
        {t('subtotal', { count: quote.lines.filter((line) => line.quote).length })}
      </dt>
      <dd className="text-right">{formatMoney(totals.subtotal)}</dd>
      {totals.discountPercent > 0 ? (
        <>
          <dt className="text-muted-foreground flex flex-wrap items-center gap-2">
            {t('discount', { days: totals.rentalDays })}
            <DiscountBadge percent={totals.discountPercent} />
          </dt>
          <dd className="text-right">−{formatMoney(totals.discount)}</dd>
        </>
      ) : null}
      <dt className="border-border border-t pt-1.5 font-medium">{t('total')}</dt>
      <dd className="border-border border-t pt-1.5 text-right text-base font-semibold" data-testid="checkout-total">
        {formatMoney(totals.totalPrice)}
      </dd>
    </dl>
  );
}
