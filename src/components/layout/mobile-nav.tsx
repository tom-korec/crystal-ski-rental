'use client';

import { LogInIcon, MenuIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet';
import type { Role } from '~/lib/roles';
import { LANDING } from '~/lib/routes';
import { cn } from '~/lib/utils';

import { AccountPanel } from './account-panel';
import { Logo } from './logo';
import type { NavLink } from './nav-links';
import { ThemeSwitcher } from './theme-switcher';

interface MobileNavProps {
  links: NavLink[];
  /** Who is signed in; a visitor gets a way to sign in instead. */
  account: { name: string; role: Role | null } | null;
  homeHref: string;
}

/** Below `md`, a sheet: the logo, the main navigation, and the account at the bottom. */
export function MobileNav({ links, account, homeHref }: MobileNavProps) {
  const t = useTranslations('nav');
  const tTheme = useTranslations('theme');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="md:hidden" data-testid="nav-menu" />}
        aria-label={t('openMenu')}
      >
        <MenuIcon />
      </SheetTrigger>

      <SheetContent side="right" className="flex flex-col gap-6 p-5" aria-label={t('primary')}>
        <SheetTitle className="sr-only">{t('menu')}</SheetTitle>
        {/* The sheet's own close button sits in the top corner, level with the logo. */}
        <Link
          href={homeHref}
          onClick={close}
          className="focus-visible:ring-ring/50 w-fit rounded-md outline-none focus-visible:ring-3"
          data-testid="mobile-home-link"
        >
          <Logo />
        </Link>

        <nav aria-label={t('primary')} className="flex flex-col">
          {links.map((link) => {
            const current =
              pathname === link.href || (link.includesSubpages === true && pathname.startsWith(`${link.href}/`));

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'hover:bg-muted focus-visible:ring-ring/50 rounded-lg px-2 py-2.5 text-base transition-colors outline-none focus-visible:ring-3',
                  current ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`mobile-${link.testId}`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="border-border mt-auto border-t pt-4">
          {account ? (
            <AccountPanel name={account.name} role={account.role} onNavigate={close} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 px-2">
                <span className="text-muted-foreground text-xs">{tTheme('label')}</span>
                <ThemeSwitcher labelled className="w-full" />
              </div>
              <Button
                nativeButton={false}
                render={<Link href={LANDING} onClick={close} />}
                data-testid="mobile-nav-sign-in"
              >
                <LogInIcon aria-hidden />
                {t('signIn')}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
