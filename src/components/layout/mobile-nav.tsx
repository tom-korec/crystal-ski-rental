'use client';

import { MenuIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';

import type { NavLink } from './nav-links';
import { ThemeSwitcher } from './theme-switcher';

interface MobileNavProps {
  links: NavLink[];
  name: string;
}

/** The header links below `md`, in a sheet. */
export function MobileNav({ links, name }: MobileNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="md:hidden" data-testid="nav-menu" />}
        aria-label={t('openMenu')}
      >
        <MenuIcon />
      </SheetTrigger>

      <SheetContent side="left" className="flex flex-col gap-6 p-5" aria-label={t('primary')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <SheetTitle>{t('menu')}</SheetTitle>
            <span className="text-muted-foreground text-sm">{name}</span>
          </div>
          <SheetClose render={<Button variant="ghost" size="icon-sm" />} aria-label={t('closeMenu')}>
            <XIcon />
          </SheetClose>
        </div>

        <nav className="flex flex-col">
          {links.map((link) => {
            const current = pathname === link.href;

            return (
              <SheetClose
                key={link.href}
                render={<Link href={link.href} />}
                nativeButton={false}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'hover:bg-muted focus-visible:ring-ring/50 rounded-lg px-2 py-2.5 text-sm transition-colors outline-none focus-visible:ring-3',
                  current ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                )}
                data-testid={`mobile-${link.testId}`}
              >
                {t(link.labelKey)}
              </SheetClose>
            );
          })}
        </nav>

        <ThemeSwitcher className="self-start" />
      </SheetContent>
    </Sheet>
  );
}
