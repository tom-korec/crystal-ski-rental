'use client';

import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';
import { useFormatMoney } from '~/hooks/use-format-money';
import type { RouterOutputs } from '~/trpc/react';

type Quote = RouterOutputs['reservation']['quote'];

interface CartLinesProps {
  quote: Quote;
  rentalDays: number;
  onRemove: (skiId: string) => void;
}

/** The pairs of a reservation being put together, each priced, with anything that stops the booking (FR-36). */
export function CartLines({ quote, rentalDays, onRemove }: CartLinesProps) {
  const t = useTranslations('checkout');
  const formatMoney = useFormatMoney();

  return (
    <ul className="divide-border flex flex-col divide-y">
      {quote.missing > 0 ? (
        <li className="text-destructive flex items-center gap-2 py-3 text-sm">
          <AlertTriangleIcon className="size-4" aria-hidden />
          {t('missing', { count: quote.missing })}
        </li>
      ) : null}
      {quote.lines.map(({ ski, quote: line, problem }) => (
        <li
          key={ski.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
          data-testid="checkout-line"
          data-problem={problem ?? undefined}
        >
          <span className="flex min-w-0 flex-col">
            <span className="font-medium">
              {ski.model.brand.name} {ski.model.name}
            </span>
            <span className="text-muted-foreground text-sm">{t('length', { length: ski.lengthCm })}</span>
            {problem ? (
              <span className="text-destructive flex items-center gap-1.5 text-sm">
                <AlertTriangleIcon className="size-4" aria-hidden />
                {t(`problem.${problem}`)}
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-3">
            <span className="flex flex-col items-end tabular-nums">
              <span className="text-muted-foreground text-xs" data-testid="line-days">
                {t('perDayTimesDays', { price: formatMoney(ski.model.pricePerDay), days: rentalDays })}
              </span>
              {line ? <span>{formatMoney(line.subtotal)}</span> : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('remove', { skis: `${ski.model.brand.name} ${ski.model.name}` })}
              onClick={() => onRemove(ski.id)}
              data-testid="remove-line"
            >
              <XIcon aria-hidden />
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
