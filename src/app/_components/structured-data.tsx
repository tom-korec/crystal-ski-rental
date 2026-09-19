import { getTranslations } from 'next-intl/server';

import { env } from '~/env';
import { appUrl } from '~/lib/app-url';
import { OPENING_HOURS_FIELDS, parseOpeningHours, WEEKDAYS } from '~/lib/opening-hours';
import { storeRoute } from '~/lib/routes';
import { api } from '~/trpc/server';

type Store = Awaited<ReturnType<typeof api.store.list>>[number];

const time = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** schema.org spells weekdays in English with a capital, which is also how `WEEKDAYS` is ordered. */
function openingHours(store: Store) {
  return OPENING_HOURS_FIELDS.flatMap((field, index) => {
    const intervals = store[field] ? (parseOpeningHours(store[field]) ?? []) : [];
    const day = WEEKDAYS[index];

    return intervals.map((interval) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${day ? day.charAt(0).toUpperCase() + day.slice(1) : ''}`,
      opens: time(interval.from),
      closes: time(interval.to),
    }));
  });
}

/**
 * What the stores are, in the vocabulary search engines read (schema.org). It describes a demo, which is
 * why the pages stay `noindex` unless `SEARCH_INDEXING` is on.
 */
export async function StructuredData() {
  const [stores, t] = await Promise.all([api.store.list(), getTranslations('app')]);
  const base = appUrl(env);

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}#organization`,
        name: t('name'),
        url: base,
        description: t('description'),
      },
      ...stores.map((store) => ({
        '@type': 'SkiRental',
        '@id': `${base}${storeRoute(store.id)}`,
        name: `${t('name')} ${store.name}`,
        parentOrganization: { '@id': `${base}#organization` },
        url: `${base}${storeRoute(store.id)}`,
        telephone: store.phone,
        email: store.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${store.street} ${store.houseNumber}`,
          addressLocality: store.city,
          postalCode: store.zipCode,
          addressCountry: 'SK',
        },
        openingHoursSpecification: openingHours(store),
      })),
    ],
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
