'use client';

import { CheckCircle2Icon, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { useShopRoutes } from '~/components/layout/shop-routes';
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
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { rentalPeriod, toUtcDate } from '~/lib/date';
import type { AddToCartOutcome, ReservationCart } from '~/lib/reservation-cart';
import { MAX_SKIS_PER_RESERVATION } from '~/lib/reservation-schema';
import { SEARCH_PARAMS } from '~/lib/routes';
import { api } from '~/trpc/react';

export interface AddedSki {
  id: string;
  lengthCm: number;
  model: { name: string; brand: { name: string } };
  store: { id: string; name: string };
}

export interface AddAttempt {
  ski: AddedSki;
  outcome: AddToCartOutcome;
  /** The cart after the attempt, to count what it holds. */
  cart: ReservationCart | null;
}

interface AddToReservationDialogProps {
  attempt: AddAttempt | null;
  onClose: () => void;
  /** Replace the cart with a new one holding just this ski. */
  onStartOver: (ski: AddedSki) => void;
}

/**
 * What happened when a pair was added to the reservation (FR-33): added, already there, or refused
 * because the reservation is for another store or other dates (BR-6), or is full. Rendered once, outside
 * the results, so it survives the list changing underneath it.
 */
export function AddToReservationDialog({ attempt, onClose, onStartOver }: AddToReservationDialogProps) {
  return (
    <Dialog open={attempt !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="add-to-reservation-dialog">
        {attempt ? <AttemptContent attempt={attempt} onStartOver={onStartOver} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

interface AttemptContentProps extends Omit<AddToReservationDialogProps, 'attempt'> {
  attempt: AddAttempt;
}

function AttemptContent({ attempt, onStartOver, onClose }: AttemptContentProps) {
  const t = useTranslations('cart');
  const formatDateRange = useFormatDateRange();
  const stores = api.store.list.useQuery();
  const routes = useShopRoutes();
  const { ski, outcome, cart } = attempt;

  const skis = `${ski.model.brand.name} ${ski.model.name}`;
  const periodOf = (range: { startDate: string; endDate: string }) => {
    const start = toUtcDate(range.startDate);
    return formatDateRange(start, rentalPeriod({ startDate: start, endDate: toUtcDate(range.endDate) }).lastDay);
  };
  const count = cart?.skiIds.length ?? 0;

  const proceed = (
    <Button nativeButton={false} render={<Link href={routes.reserve} />} data-testid="proceed-to-reservation">
      {t('proceed')}
    </Button>
  );

  if (outcome.kind === 'added' || outcome.kind === 'alreadyAdded' || outcome.kind === 'full') {
    const title =
      outcome.kind === 'added' ? t('addedTitle') : outcome.kind === 'full' ? t('fullTitle') : t('alreadyTitle');

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="add-outcome" data-outcome={outcome.kind}>
            {outcome.kind === 'full' ? (
              <InfoIcon className="text-primary size-5" aria-hidden />
            ) : (
              <CheckCircle2Icon className="text-primary size-5" aria-hidden />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {outcome.kind === 'full'
              ? t('fullDescription', { max: MAX_SKIS_PER_RESERVATION })
              : t('addedDescription', {
                  skis,
                  length: ski.lengthCm,
                  store: ski.store.name,
                  period: cart ? periodOf(cart) : '',
                })}
          </DialogDescription>
        </DialogHeader>
        {outcome.kind !== 'full' ? (
          <p className="text-sm" data-testid="cart-summary">
            {t('holds', { count })}
          </p>
        ) : null}
        <DialogFooter>
          {outcome.kind !== 'full' ? (
            <DialogClose render={<Button variant="outline" data-testid="reserve-another" />}>
              {t('reserveAnother')}
            </DialogClose>
          ) : (
            <DialogClose render={<Button variant="outline" />}>{t('close')}</DialogClose>
          )}
          {proceed}
        </DialogFooter>
      </>
    );
  }

  const cartStore = stores.data?.find((store) => store.id === outcome.cart.storeId)?.name ?? '';
  const cartPeriod = periodOf(outcome.cart);
  const cartCount = outcome.cart.skiIds.length;
  const searchCartDates = `${routes.search}?${new URLSearchParams({
    [SEARCH_PARAMS.store]: outcome.cart.storeId,
    [SEARCH_PARAMS.from]: outcome.cart.startDate,
    [SEARCH_PARAMS.to]: outcome.cart.endDate,
  }).toString()}`;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2" data-testid="add-outcome" data-outcome={outcome.kind}>
          <InfoIcon className="text-primary size-5" aria-hidden />
          {outcome.kind === 'otherStore' ? t('otherStoreTitle') : t('otherDatesTitle')}
        </DialogTitle>
        <DialogDescription>
          {outcome.kind === 'otherStore'
            ? t('otherStoreDescription', { count: cartCount, cartStore, store: ski.store.name })
            : t('otherDatesDescription', { count: cartCount, cartStore, cartPeriod })}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="sm:flex-wrap">
        {outcome.kind === 'otherDates' ? (
          <Button variant="outline" nativeButton={false} render={<Link href={searchCartDates} onClick={onClose} />}>
            {t('searchCartDates')}
          </Button>
        ) : (
          <DialogClose render={<Button variant="outline" />}>{t('keep')}</DialogClose>
        )}
        <Button variant="outline" onClick={() => onStartOver(ski)} data-testid="start-new-reservation">
          {t('startOver')}
        </Button>
        {proceed}
      </DialogFooter>
    </>
  );
}
