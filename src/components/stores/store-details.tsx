'use client';

import { CalendarClockIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { addDays, todayDateString, toUtcDate } from '~/lib/date';
import { formatPhone, formatZipCode } from '~/lib/format';
import { formatOpeningHours, OPENING_HOURS_FIELDS, type StoreHours, WEEKDAYS } from '~/lib/opening-hours';
import { cn } from '~/lib/utils';

export type StoreDetailsData = {
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
} & StoreHours;

interface StoreDetailsProps {
  store: StoreDetailsData;
}

/** How far ahead special days are listed: about the reach of a booking. */
const SPECIAL_DAYS_AHEAD = 90;

/** Monday is 0, following the store's week. The stores are in Slovakia, so "today" is judged there. */
function todayIndex(): number {
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Europe/Bratislava' }).format(new Date());
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
}

/** Where the store is, how to reach it, and when it is open, special days included (FR-12, FR-33, BR-7). */
export function StoreDetails({ store }: StoreDetailsProps) {
  const t = useTranslations('stores');
  const format = useFormatter();
  const today = todayIndex();
  const from = todayDateString();
  const until = addDays(from, SPECIAL_DAYS_AHEAD);
  const upcoming = store.specialDays.filter((day) => day.date >= from && day.date <= until);

  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2" data-testid="store-details">
      <div className="flex flex-col gap-2">
        <p className="font-medium">{store.name}</p>
        <address className="text-muted-foreground flex items-start gap-2 not-italic">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {store.street} {store.houseNumber}
            <br />
            {formatZipCode(store.zipCode)} {store.city}
          </span>
        </address>
        <a
          href={`tel:${store.phone}`}
          className="text-primary flex items-center gap-2 underline-offset-4 hover:underline"
        >
          <PhoneIcon className="size-4" aria-hidden />
          {formatPhone(store.phone)}
        </a>
        <a
          href={`mailto:${store.email}`}
          className="text-primary flex items-center gap-2 break-all underline-offset-4 hover:underline"
        >
          <MailIcon className="size-4 shrink-0" aria-hidden />
          {store.email}
        </a>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="font-medium">{t('openingHours')}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
            {OPENING_HOURS_FIELDS.map((field, index) => {
              const hours = formatOpeningHours(store[field]);
              return (
                <div key={field} className={cn('contents', index === today && 'font-medium')}>
                  <dt className={cn(index !== today && 'text-muted-foreground')}>
                    {t(`weekdays.${WEEKDAYS[index] ?? 'monday'}`)}
                  </dt>
                  <dd className={cn(!hours && 'text-muted-foreground')}>{hours ?? t('closed')}</dd>
                </div>
              );
            })}
          </dl>
        </div>

        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-2" data-testid="store-special-days">
            <p className="flex items-center gap-1.5 font-medium">
              <CalendarClockIcon className="text-highlight size-4" aria-hidden />
              {t('specialDays')}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
              {upcoming.map((day) => (
                <div key={day.date} className="contents">
                  <dt className="text-muted-foreground">
                    {format.dateTime(toUtcDate(day.date), { day: 'numeric', month: 'short', timeZone: 'UTC' })}
                    {day.name ? ` · ${day.name}` : ''}
                  </dt>
                  <dd className={cn(!day.hours && 'text-muted-foreground')}>
                    {formatOpeningHours(day.hours) ?? t('closed')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </div>
  );
}
