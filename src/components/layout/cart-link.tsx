'use client';

import { ShoppingBagIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';
import { useReservationCart } from '~/hooks/use-reservation-cart';
import { APP_RESERVE } from '~/lib/routes';

/** The reservation being put together, once it holds a pair of skis (FR-33). */
export function CartLink() {
  const t = useTranslations('cart');
  const { cart } = useReservationCart();

  if (!cart) return null;

  const count = cart.skiIds.length;

  return (
    <Button
      size="sm"
      nativeButton={false}
      render={<Link href={APP_RESERVE} />}
      aria-label={t('linkLabel', { count })}
      data-testid="cart-link"
    >
      <ShoppingBagIcon aria-hidden />
      <span className="hidden sm:inline">{t('link')}</span>
      <span
        className="bg-primary-foreground text-primary rounded-full px-1.5 text-xs font-semibold tabular-nums"
        data-testid="cart-count"
      >
        {count}
      </span>
    </Button>
  );
}
