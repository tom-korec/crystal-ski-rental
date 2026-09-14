import '~/styles/globals.css';

import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { ThemeScript } from '~/components/layout/theme-script';
import { TRPCReactProvider } from '~/trpc/react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');

  return {
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('description'),
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
