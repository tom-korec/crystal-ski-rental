'use client';

import { useFormatter } from 'next-intl';

import { DATE_FORMAT } from '~/lib/format';

/**
 * `15 – 16 Sep 2026`. Node and browsers ship different ICU data, and Node puts thin spaces around the
 * dash where browsers use ordinary ones, which would make every server-rendered range a hydration
 * mismatch. The spacing is normalised so both render the same text.
 */
export function useFormatDateRange() {
  const format = useFormatter();

  return (start: Date, lastDay: Date) =>
    format.dateTimeRange(start, lastDay, DATE_FORMAT).replace(/[\u2009\u202F]/g, ' ');
}
