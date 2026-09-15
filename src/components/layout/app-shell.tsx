import Link from 'next/link';
import type { ReactNode } from 'react';

import { isCustomer, isStaff, type Role, roleSchema } from '~/lib/roles';
import { homeForRole, PROFILE } from '~/lib/routes';

import { CartLink } from './cart-link';
import { DemoBanner } from './demo-banner';
import { HeroArt } from './hero-art';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';
import { navLinksFor } from './nav-links';
import { PrimaryNav } from './primary-nav';
import { RoleBadge } from './role-badge';
import { SignOutButton } from './sign-out-button';
import { ThemeSwitcher } from './theme-switcher';

interface AppShellProps {
  name: string;
  role?: string | null;
  children: ReactNode;
}

/** The signed-in frame: header with navigation for the role, and the page below it. */
export function AppShell({ name, role, children }: AppShellProps) {
  const links = navLinksFor(role);
  const parsedRole: Role = roleSchema.catch('USER').parse(role);

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
          <div className="flex items-center gap-2">
            <MobileNav links={links} name={name} />
            <Link
              href={homeForRole(role)}
              className="focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3"
              data-testid="home-link"
            >
              <Logo />
            </Link>
          </div>

          <div className="2xl:pointer-events-none 2xl:absolute 2xl:inset-x-0 2xl:top-1/2 2xl:mx-auto 2xl:w-full 2xl:max-w-6xl 2xl:-translate-y-1/2 2xl:px-6 2xl:[&_a]:pointer-events-auto">
            <PrimaryNav links={links} />
          </div>

          <div className="relative ms-auto flex items-center gap-3">
            {isCustomer(role) ? <CartLink /> : null}
            <Link
              href={PROFILE}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 hidden rounded-md text-sm transition-colors outline-none focus-visible:ring-3 lg:inline"
              data-testid="account-name"
            >
              {name}
            </Link>
            {isStaff(role) ? (
              <span className="hidden sm:inline-flex">
                <RoleBadge role={parsedRole} />
              </span>
            ) : null}
            <ThemeSwitcher className="hidden md:inline-flex" />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
