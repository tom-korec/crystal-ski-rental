import type { Metadata } from 'next';
import { LogInIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { DemoBanner } from '~/components/layout/demo-banner';
import { HeroArt } from '~/components/layout/hero-art';
import { Logo } from '~/components/layout/logo';
import { SiteFooter } from '~/components/layout/site-footer';
import { ThemeSwitcher } from '~/components/layout/theme-switcher';
import { Button } from '~/components/ui/button';
import { Skeleton } from '~/components/ui/skeleton';
import { LANDING, SIGN_IN } from '~/lib/routes';
import { redirectIfSignedIn } from '~/server/better-auth/guards';

import { LandingSearch } from './_components/landing-search';
import { LandingStores } from './_components/landing-stores';
import { StructuredData } from './_components/structured-data';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('landing');

  return { description: t('subtitle'), alternates: { canonical: LANDING } };
}

/** Visitors land on the search, not on a sign-in form: an account is only needed to book (FR-37). */
export default async function Landing() {
  await redirectIfSignedIn();

  const t = await getTranslations('landing');
  const tAuth = await getTranslations('auth');

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <StructuredData />
      <HeroArt />
      <DemoBanner />

      <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-10">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="bg-card" />
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href={SIGN_IN} />}
            data-testid="landing-sign-in"
          >
            <LogInIcon aria-hidden />
            {tAuth('signIn')}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center gap-12 px-4 pt-8 pb-20 sm:pt-12">
        <div className="flex max-w-4xl flex-col items-center gap-4 text-center [text-shadow:0_0_18px_rgb(243_248_252/0.95)] dark:[text-shadow:0_0_18px_rgb(7_16_31/0.95)]">
          <p className="text-secondary-foreground text-xs font-medium tracking-[0.2em] uppercase sm:text-sm dark:text-white/85">
            {t('eyebrow')}
          </p>
          <h1 className="text-5xl leading-none font-bold tracking-tight text-balance sm:text-7xl lg:text-[5.5rem]">
            {t('headline')}
          </h1>
          <p className="text-secondary-foreground max-w-2xl text-base text-balance sm:text-lg dark:text-white/85">
            {t('subtitle')}
          </p>
        </div>

        <div className="w-full max-w-3xl">
          <LandingSearch />
        </div>

        <Suspense fallback={<Skeleton className="h-64 w-full max-w-5xl" />}>
          <LandingStores />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
