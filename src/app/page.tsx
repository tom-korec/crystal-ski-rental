import { SearchIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AuthPanel } from '~/components/layout/auth-panel';
import { DemoAccounts } from '~/components/layout/demo-accounts';
import { DemoBanner } from '~/components/layout/demo-banner';
import { HeroArt } from '~/components/layout/hero-art';
import { Logo } from '~/components/layout/logo';
import { SiteFooter } from '~/components/layout/site-footer';
import { ThemeSwitcher } from '~/components/layout/theme-switcher';
import { Button } from '~/components/ui/button';
import { SEARCH } from '~/lib/routes';
import { redirectIfSignedIn } from '~/server/better-auth/guards';

export default async function Landing() {
  await redirectIfSignedIn();

  const t = await getTranslations('landing');

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      <HeroArt />
      <DemoBanner />

      <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-10">
        <Logo />
        <ThemeSwitcher className="bg-card" />
      </header>

      <main className="flex flex-1 flex-col items-center gap-10 px-4 pt-8 pb-20 sm:pt-16">
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

        <div className="flex w-full flex-col items-center gap-4">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={SEARCH} />}
            className="-mt-4 mb-2"
            data-testid="landing-find-skis"
          >
            <SearchIcon aria-hidden />
            {t('findSkis')}
          </Button>
          <AuthPanel />
          <DemoAccounts />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
