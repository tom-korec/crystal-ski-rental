import { ClockIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { todayDateString } from '~/lib/date';
import { formatPhone, formatZipCode } from '~/lib/format';
import { hoursOn } from '~/lib/opening-hours';
import { storeRoute } from '~/lib/routes';
import { api } from '~/trpc/server';

/** Where the four stores are and when they are open today, so a visitor can plan before booking (FR-12). */
export async function LandingStores() {
  const [stores, t, tStores] = await Promise.all([
    api.store.list(),
    getTranslations('landing'),
    getTranslations('stores'),
  ]);
  const today = todayDateString();

  return (
    <section className="flex w-full max-w-5xl flex-col gap-4">
      <h2 className="text-center text-2xl font-semibold">{t('storesTitle')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stores.map((store) => {
          const hours = hoursOn(store, today);

          return (
            <Card key={store.id} className="h-full">
              <CardHeader>
                <CardTitle>
                  <Link href={storeRoute(store.id)} className="hover:underline">
                    {store.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-secondary-foreground flex flex-col gap-2 text-sm">
                <p className="flex items-start gap-2">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    {store.street} {store.houseNumber}, {formatZipCode(store.zipCode)} {store.city}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <ClockIcon className="size-4 shrink-0" aria-hidden />
                  <span>
                    {t('openToday')}: {hours.hours ?? tStores('closed')}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <PhoneIcon className="size-4 shrink-0" aria-hidden />
                  <a href={`tel:${store.phone}`} className="hover:underline">
                    {formatPhone(store.phone)}
                  </a>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Link href={storeRoute()} className="text-center text-sm font-medium underline-offset-4 hover:underline">
        {t('allStores')}
      </Link>
    </section>
  );
}
