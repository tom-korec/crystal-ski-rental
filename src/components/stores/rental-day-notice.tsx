'use client';

import { CalendarClockIcon, CalendarXIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { toUtcDate } from '~/lib/date';
import {
  closedRentalDays,
  type DayHours,
  formatOpeningHours,
  type RentalDays,
  specialRentalDays,
} from '~/lib/opening-hours';

interface RentalDayNoticeProps {
  days: RentalDays;
  store: string;
}

/**
 * What a rental's pickup and return days mean for the customer (BR-7): a closed day stops the booking;
 * a special day with its own hours is allowed, but worth knowing, since they are often short.
 */
export function RentalDayNotice({ days, store }: RentalDayNoticeProps) {
  const t = useTranslations('rentalDays');
  const format = useFormatter();
  const closed = closedRentalDays(days);
  const special = specialRentalDays(days);

  if (closed.length === 0 && special.length === 0) return null;

  const role = (day: DayHours) =>
    day.date === days.pickup.date && day.date === days.return.date
      ? 'both'
      : day.date === days.pickup.date
        ? 'pickup'
        : 'return';
  const date = (day: DayHours) =>
    format.dateTime(toUtcDate(day.date), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  return (
    <div className="flex flex-col gap-1.5" data-testid="rental-day-notice">
      {closed.map((day) => (
        <p
          key={`closed-${day.date}`}
          role="alert"
          className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
          data-testid="closed-day"
        >
          <CalendarXIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('closed', { store, role: role(day), date: date(day), name: day.special?.name ?? '' })}
        </p>
      ))}
      {special.map((day) => (
        <p
          key={`special-${day.date}`}
          className="bg-highlight/15 text-foreground flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
          data-testid="special-day-warning"
        >
          <CalendarClockIcon className="text-highlight mt-0.5 size-4 shrink-0" aria-hidden />
          {t('special', {
            store,
            role: role(day),
            date: date(day),
            name: day.special?.name ?? 'none',
            hours: formatOpeningHours(day.hours) ?? '',
          })}
        </p>
      ))}
    </div>
  );
}
