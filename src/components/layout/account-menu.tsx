'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import type { Role } from '~/lib/roles';
import { cn } from '~/lib/utils';

import { AccountAvatar } from './account-avatar';
import { AccountPanel } from './account-panel';
import { RoleBadge } from './role-badge';

interface AccountMenuProps {
  name: string;
  role: Role | null;
}

/** The account in the header from `md` up: the initials (and from `lg` the name), opening a panel with the account, theme and sign out. */
export function AccountMenu({ name, role }: AccountMenuProps) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            className="hidden h-9 max-w-64 gap-2 px-1.5 md:inline-flex"
            aria-label={t('accountMenu', { name })}
            data-testid="account-menu"
          />
        }
      >
        <AccountAvatar name={name} />
        {/* On tablets the circle alone; the panel still names the account. */}
        <span className="hidden truncate text-sm font-medium lg:inline" data-testid="account-name">
          {name}
        </span>
        {role ? (
          <span className="hidden lg:inline-flex">
            <RoleBadge role={role} />
          </span>
        ) : null}
        <ChevronDownIcon
          className={cn('text-muted-foreground size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-3">
        <AccountPanel name={name} role={role} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
