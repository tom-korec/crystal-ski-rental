'use client';

import { ShoppingBagIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';
import { useCartReplacedNotice } from '~/hooks/use-reservation-cart';

/** Tells a customer who just signed in that the skis they picked replaced the account's older cart. */
export function CartReplacedNotice() {
  const t = useTranslations('cart');
  const { shown, dismiss } = useCartReplacedNotice();

  if (!shown) return null;

  return (
    <div
      role="status"
      className="bg-card ring-foreground/10 flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-sm ring-1"
      data-testid="cart-replaced"
    >
      <ShoppingBagIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">{t('replaced')}</p>
      <Button variant="ghost" size="icon-xs" aria-label={t('dismissReplaced')} onClick={dismiss}>
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
