import type { MetadataRoute } from 'next';

import { env } from '~/env';
import { appUrl } from '~/lib/app-url';
import { SITEMAP } from '~/lib/routes';

/**
 * Crawling the public pages is allowed so that crawlers and SEO tools can read the pages and their
 * `noindex`, which is what actually keeps the demo out of search results (see .claude/seo-plan.md).
 * Signed-in areas and the API are never crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  const base = appUrl(env);

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app/', '/staff/', '/profile/', '/api/'] },
    sitemap: env.SEARCH_INDEXING ? `${base}${SITEMAP}` : undefined,
  };
}
