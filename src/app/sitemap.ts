import type { MetadataRoute } from 'next';

import { env } from '~/env';
import { appUrl } from '~/lib/app-url';
import { LANDING, LEGAL_ROUTES, SEARCH, STORES } from '~/lib/routes';

/** The pages a visitor can reach without an account. Everything else is behind sign-in. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl(env);

  return [LANDING, SEARCH, STORES, ...Object.values(LEGAL_ROUTES)].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
}
