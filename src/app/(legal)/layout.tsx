import Link from 'next/link';
import type { ReactNode } from 'react';

import { HeroArt } from '~/components/layout/hero-art';
import { Logo } from '~/components/layout/logo';
import { SiteFooter } from '~/components/layout/site-footer';
import { ThemeSwitcher } from '~/components/layout/theme-switcher';
import { LANDING } from '~/lib/routes';

/** Public pages anyone can read, signed in or not. */
export default function LegalLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <HeroArt anchor="top" className="h-[40rem] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
      <header className="border-border/60 bg-card/60 sticky top-0 z-20 border-b backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={LANDING} className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3">
            <Logo />
          </Link>
          <ThemeSwitcher />
        </div>
      </header>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
