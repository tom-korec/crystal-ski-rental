'use client';

import { CheckCircle2Icon, SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { PageHeader } from '~/components/common/page-header';
import { LoadingRegion } from '~/components/common/skeletons/loading-region';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { useReservationCart } from '~/hooks/use-reservation-cart';
import { APP_HOME, APP_RESERVATIONS } from '~/lib/routes';

import { CheckoutForm } from './checkout-form';

export interface BookedReservation {
  store: string;
  period: string;
  count: number;
}

/** The reservation being put together, booked in one go (FR-33, FR-36). */
export function ReservationCheckout() {
  const t = useTranslations('checkout');
  const { cart, setCart, isReady } = useReservationCart();
  const [booked, setBooked] = useState<BookedReservation | null>(null);

  if (booked) {
    return (
      <Card data-testid="checkout-booked">
        <CardContent className="flex flex-col items-start gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight" data-testid="page-title">
            <CheckCircle2Icon className="text-primary size-6" aria-hidden />
            {t('bookedTitle')}
          </h1>
          <p className="text-muted-foreground">{t('bookedDescription', { ...booked })}</p>
          <div className="flex flex-wrap gap-2">
            <Button nativeButton={false} render={<Link href={APP_RESERVATIONS} />} data-testid="booked-reservations">
              {t('viewReservations')}
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href={APP_HOME} />}>
              {t('findMore')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Button nativeButton={false} render={<Link href={APP_HOME} />}>
              <SearchIcon aria-hidden />
              {t('findSkis')}
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <CheckoutForm
      cart={cart}
      onCartChange={setCart}
      onBooked={(reservation) => {
        setBooked(reservation);
        setCart(null);
      }}
    />
  );
}
