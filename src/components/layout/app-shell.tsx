import Link from 'next/link';
import type { ReactNode } from 'react';

import { isStaff, type Role, roleSchema } from '~/lib/roles';
import { homeForRole, PROFILE } from '~/lib/routes';

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
    <div className="flex min-h-screen flex-col">
      <header className="border-border/60 bg-card/60 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
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

          <PrimaryNav links={links} />

          <div className="ms-auto flex items-center gap-3">
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
