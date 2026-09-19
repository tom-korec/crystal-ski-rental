import '~/styles/globals.css';

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { ThemeScript } from '~/components/layout/theme-script';
import { env } from '~/env';
import { appUrl } from '~/lib/app-url';
import { TRPCReactProvider } from '~/trpc/react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');

  const title = { default: t('name'), template: `%s · ${t('name')}` };

  return {
    metadataBase: new URL(appUrl(env)),
    title,
    description: t('description'),
    applicationName: t('name'),
    openGraph: {
      type: 'website',
      siteName: t('name'),
      title: t('name'),
      description: t('description'),
      locale: await getLocale(),
    },
    twitter: { card: 'summary_large_image', title: t('name'), description: t('description') },
    // The demo is built to pass SEO tools but must never compete with real ski rentals, so it is
    // crawlable and not indexable unless SEARCH_INDEXING says otherwise (.claude/seo-plan.md).
    robots: env.SEARCH_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  };
}

const geist = Geist({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-geist-sans',
});

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    // The theme script sets the `dark` class before hydration, which React would otherwise flag.
    <html lang={locale} className={geist.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <NextIntlClientProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
