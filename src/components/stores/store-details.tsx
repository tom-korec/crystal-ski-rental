'use client';

import { MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { OpeningHoursField } from '~/lib/store-schema';

const WEEK = [
  { field: 'openingHoursMonday', day: 'monday' },
  { field: 'openingHoursTuesday', day: 'tuesday' },
  { field: 'openingHoursWednesday', day: 'wednesday' },
  { field: 'openingHoursThursday', day: 'thursday' },
  { field: 'openingHoursFriday', day: 'friday' },
  { field: 'openingHoursSaturday', day: 'saturday' },
  { field: 'openingHoursSunday', day: 'sunday' },
] as const satisfies readonly { field: OpeningHoursField; day: string }[];
import { cn } from '~/lib/utils';

export type StoreDetailsData = {
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
} & Record<OpeningHoursField, string>;

interface StoreDetailsProps {
  store: StoreDetailsData;
}

/** "031 01", as Slovak zip codes are written. */
function formatZip(zipCode: string): string {
  return `${zipCode.slice(0, 3)} ${zipCode.slice(3)}`;
}

/** "+421 903 123 456": the country code, then groups of three. */
function formatPhone(phone: string): string {
  const match = /^\+(421|420)(\d+)$/.exec(phone);
  if (!match) return phone;
  return `+${match[1]} ${match[2]?.replace(/(\d{3})(?=\d)/g, '$1 ')}`;
}

/** Monday is 0, following the store's week. The stores are in Slovakia, so "today" is judged there. */
function todayIndex(): number {
  const weekday = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Europe/Bratislava' }).format(new Date());
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
}

/** Where the store is, how to reach it, and when it is open (FR-12, FR-33). */
export function StoreDetails({ store }: StoreDetailsProps) {
  const t = useTranslations('stores');
  const today = todayIndex();

  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2" data-testid="store-details">
      <div className="flex flex-col gap-2">
        <p className="font-medium">{store.name}</p>
        <address className="text-muted-foreground flex items-start gap-2 not-italic">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {store.street} {store.houseNumber}
            <br />
            {formatZip(store.zipCode)} {store.city}
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

      <div className="flex flex-col gap-2">
        <p className="font-medium">{t('openingHours')}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
          {WEEK.map(({ field, day }, index) => (
            <div key={field} className={cn('contents', index === today && 'font-medium')}>
              <dt className={cn(index !== today && 'text-muted-foreground')}>{t(`weekdays.${day}`)}</dt>
              <dd className={cn(!store[field] && 'text-muted-foreground')}>{store[field] || t('closed')}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
