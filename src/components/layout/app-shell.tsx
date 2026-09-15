import { LogInIcon } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Button } from '~/components/ui/button';
import { isCustomer, isStaff, type Role, roleSchema } from '~/lib/roles';
import { homeForRole, LANDING } from '~/lib/routes';

import { AccountMenu } from './account-menu';
import { CartLink } from './cart-link';
import { CartReplacedNotice } from './cart-replaced-notice';
import { DemoBanner } from './demo-banner';
import { HeroArt } from './hero-art';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { navLinksFor } from './nav-links';
import { PrimaryNav } from './primary-nav';
import { SiteFooter } from './site-footer';
import { ThemeSwitcher } from './theme-switcher';

interface AppShellProps {
  /** Who is signed in, or null for a visitor browsing the public pages. */
  account: { name: string; role?: string | null } | null;
  /** Off where the pages it links to are not reachable yet, such as before accepting the terms. */
  navigation?: boolean;
  children: ReactNode;
}

/** The frame of every page but the landing: header with navigation for the role or a visitor, and the page. */
export async function AppShell({ account, navigation = true, children }: AppShellProps) {
  const t = await getTranslations('nav');
  const role = account?.role;
  const links = navigation ? navLinksFor(account) : [];
  const parsedRole: Role = roleSchema.catch('USER').parse(role);
  // Customers all share one role, so only staff see theirs.
  const accountRole = isStaff(role) ? parsedRole : null;
  const shops = account === null || isCustomer(role);
  const homeHref = account ? homeForRole(role) : LANDING;

  return (
    <div className="relative isolate flex min-h-screen flex-col">
      {/* The landing illustration behind the top of every page, fading into the page ground. */}
      <HeroArt anchor="top" className="h-[40rem] [mask-image:linear-gradient(to_bottom,black_60%,transparent)]" />
      <DemoBanner />
      <header className="border-border/60 bg-card/60 sticky top-0 z-20 border-b backdrop-blur">
        {/*
          The logo against the left edge of the screen and the account against the right. Where the screen
          is wide enough, the navigation lines up with the page content below; otherwise it follows the logo.
        */}
        <div className="relative flex items-center gap-6 px-4 py-3 sm:px-6">
          <Link
            href={homeHref}
            className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3"
            data-testid="home-link"
          >
            <Logo />
          </Link>

          <div className="2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-1/2 2xl:mx-auto 2xl:w-full 2xl:max-w-6xl 2xl:-translate-y-1/2 2xl:px-6 2xl:[&_a]:pointer-events-auto">
            <PrimaryNav links={links} />
          </div>

          <div className="relative ms-auto flex items-center gap-3">
            {navigation && shops ? <CartLink /> : null}
            {account ? (
              <AccountMenu name={account.name} role={accountRole} />
            ) : (
              <>
                <ThemeSwitcher className="hidden md:flex" />
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={LANDING} />}
                  className="hidden md:inline-flex"
                  data-testid="nav-sign-in"
                >
                  <LogInIcon aria-hidden />
                  {t('signIn')}
                </Button>
              </>
            )}
            {/* On phones the menu button closes the header on the right, where a thumb reaches it. */}
            <MobileNav
              links={links}
              account={account ? { name: account.name, role: accountRole } : null}
              homeHref={homeHref}
            />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {account && isCustomer(role) ? <CartReplacedNotice /> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
