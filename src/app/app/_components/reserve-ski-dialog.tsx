'use client';

import { CheckCircle2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { FormError } from '~/components/common/form-error';
import type { SkiCardData } from '~/components/skis/ski-card';
import { PriceBreakdown } from '~/components/skis/price-breakdown';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Skeleton } from '~/components/ui/skeleton';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useFormatMoney } from '~/hooks/use-format-money';
import { rentalPeriod, toUtcDate } from '~/lib/date';
import type { RentalQuote } from '~/lib/pricing';
import type { DateRange } from '~/lib/rental-range';
import { api } from '~/trpc/react';

export interface ReserveSelection {
  ski: SkiCardData & { store: { id: string } };
  quote: RentalQuote;
}

interface ReserveSkiDialogProps {
  selection: ReserveSelection | null;
  range: DateRange;
  onClose: () => void;
}

/**
 * Confirm a booking with the price breakdown and where to collect the skis (FR-33). Rendered once, outside
 * the result list, so the confirmation survives the booked ski leaving the results.
 */
export function ReserveSkiDialog({ selection, range, onClose }: ReserveSkiDialogProps) {
  return (
    <Dialog open={selection !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="reserve-dialog">
        {selection ? <ReserveSkiContent key={selection.ski.id} {...selection} range={range} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReserveSkiContent({ ski, quote, range }: ReserveSelection & { range: DateRange }) {
  const t = useTranslations('booking');
  const formatDateRange = useFormatDateRange();
  const formatMoney = useFormatMoney();
  const utils = api.useUtils();

  const store = api.store.byId.useQuery({ id: ski.store.id });
  const reserve = api.reservation.create.useMutation();

  // The booked ski is no longer free for these dates, so the results must stop offering it. Done on the
  // way out, so the confirmation is not replaced while it is being read.
  useEffect(() => {
    if (!reserve.isSuccess) return;
    return () => void utils.ski.search.invalidate();
  }, [reserve.isSuccess, utils]);

  const { lastDay } = rentalPeriod({ startDate: toUtcDate(range.startDate), endDate: toUtcDate(range.endDate) });
  const period = formatDateRange(toUtcDate(range.startDate), lastDay);
  const title = `${ski.model.brand.name} ${ski.model.name}`;

  return (
    <>
      {reserve.isSuccess ? (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="text-primary size-5" aria-hidden />
              {t('bookedTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('bookedDescription', { skis: title, store: ski.store.name, period })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button data-testid="booked-close" />}>{t('done')}</DialogClose>
          </DialogFooter>
        </>
      ) : (
        <>
          <DialogHeader>
            <DialogTitle>{t('title', { skis: title })}</DialogTitle>
            <DialogDescription>
              {t('summary', { length: ski.lengthCm, period, days: quote.rentalDays })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <PriceBreakdown quote={quote} />
            <div className="border-border flex flex-col gap-2 border-t pt-4">
              <p className="text-sm font-medium">{t('pickupAt')}</p>
              {store.data ? <StoreDetails store={store.data} /> : <Skeleton className="h-28 w-full" />}
            </div>
            <FormError message={reserve.error?.message} data-testid="reserve-error" />
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t('cancel')}</DialogClose>
            <Button
              onClick={() => reserve.mutate({ skiId: ski.id, ...range })}
              disabled={reserve.isPending}
              data-testid="confirm-reservation"
            >
              {reserve.isPending ? t('reserving') : t('confirm', { total: formatMoney(quote.totalPrice) })}
            </Button>
          </DialogFooter>
        </>
      )}
    </>
  );
}
