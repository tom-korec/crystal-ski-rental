'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';

/** EUR in the current locale, straight from the decimal string: a price never passes through a float. */
export function useFormatMoney() {
  const locale = useLocale();

  return useMemo(() => {
    const format = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
    return (value: string) => format.format(value as Intl.StringNumericLiteral);
  }, [locale]);
}
