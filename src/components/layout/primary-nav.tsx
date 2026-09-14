'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '~/lib/utils';

import type { NavLink } from './nav-links';

interface PrimaryNavProps {
  links: NavLink[];
}

/** The header links from `md` up; below that they live in `MobileNav`. */
export function PrimaryNav({ links }: PrimaryNavProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav aria-label={t('primary')} className="hidden items-center gap-5 text-sm md:flex">
      {links.map((link) => {
        const current = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'focus-visible:ring-ring/50 rounded-md transition-colors outline-none focus-visible:ring-3',
              current ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid={link.testId}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
