'use client';

import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { FormError } from '~/components/common/form-error';
import { PageHeader } from '~/components/common/page-header';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { AuthPanel } from '~/components/layout/auth-panel';
import { CartLines } from '~/components/reservations/cart-lines';
import { CartTotals } from '~/components/reservations/cart-totals';
import { RentalDayNotice } from '~/components/stores/rental-day-notice';
import { StoreDetails } from '~/components/stores/store-details';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useFormatDateRange } from '~/hooks/use-format-date-range';
import { useReservationCart } from '~/hooks/use-reservation-cart';
import { rentalPeriod, toUtcDate, utcDaysBetween } from '~/lib/date';
import { removeFromCart, type ReservationCart } from '~/lib/reservation-cart';
import { APP_RESERVE, SEARCH, SEARCH_PARAMS } from '~/lib/routes';
import { api } from '~/trpc/react';

/** A visitor's reservation, priced, with the account they need to book it (FR-33). */
export function GuestReservation() {
  const t = useTranslations('checkout');
  const { cart, setCart, isReady } = useReservationCart();

  if (!isReady) {
    return (
      <LoadingRegion>
        <Skeleton className="h-96 w-full" />
      </LoadingRegion>
    );
  }

  if (!cart) {
    return (
      <>
        <PageHeader title={t('title')} description={t('emptyDescription')} />
        <Card data-testid="checkout-empty">
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-muted-foreground">{t('empty')}</p>
            <Button nativeButton={false} render={<Link href={SEARCH} />}>
              <SearchIcon aria-hidden />
              {t('findSkis')}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return <GuestCart cart={cart} onCartChange={setCart} />;
}

interface GuestCartProps {
  cart: ReservationCart;
  onCartChange: (cart: ReservationCart | null) => void;
}

function GuestCart({ cart, onCartChange }: GuestCartProps) {
  const t = useTranslations('checkout');
  const formatDateRange = useFormatDateRange();
  const quote = api.reservation.quote.useQuery({
    skiIds: cart.skiIds,
    startDate: cart.startDate,
    endDate: cart.endDate,
  });

  const start = toUtcDate(cart.startDate);
  const end = toUtcDate(cart.endDate);
  const period = formatDateRange(start, rentalPeriod({ startDate: start, endDate: end }).lastDay);
  const searchAgain = `${SEARCH}?${new URLSearchParams({
    [SEARCH_PARAMS.store]: cart.storeId,
    [SEARCH_PARAMS.from]: cart.startDate,
    [SEARCH_PARAMS.to]: cart.endDate,
  }).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('title')}
        description={quote.data?.store ? t('description', { store: quote.data.store.name, period }) : period}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href={searchAgain} />} data-testid="add-more">
            {t('addMore')}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-6">
          <Card data-testid="checkout-skis">
            <CardHeader>
              <CardTitle>
                <h2>{t('skisTitle', { count: cart.skiIds.length })}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {quote.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : quote.isError ? (
                <FormError message={quote.error.message} />
              ) : (
                <>
                  <CartLines
                    quote={quote.data}
                    rentalDays={utcDaysBetween(start, end)}
                    onRemove={(skiId) => onCartChange(removeFromCart(cart, skiId))}
                  />
                  <div className="border-border border-t pt-4 text-sm">
                    <CartTotals quote={quote.data} />
                  </div>
                  {quote.data.store && quote.data.days ? (
                    <RentalDayNotice days={quote.data.days} store={quote.data.store.name} />
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          {quote.data?.store ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>{t('pickupAt')}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StoreDetails store={quote.data.store} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-24" data-testid="guest-sign-in">
          <Card size="sm" className="bg-primary/5">
            <CardHeader>
              <CardTitle>
                <h2>{t('accountTitle')}</h2>
              </CardTitle>
              <CardDescription>{t('accountDescription')}</CardDescription>
            </CardHeader>
          </Card>
          <AuthPanel customerDestination={APP_RESERVE} className="max-w-none" />
        </div>
      </div>
    </div>
  );
}
