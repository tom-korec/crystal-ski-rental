'use client';

import { UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { Role } from '~/lib/roles';
import { PROFILE } from '~/lib/routes';

import { AccountAvatar } from './account-avatar';
import { RoleBadge } from './role-badge';
import { SignOutButton } from './sign-out-button';
import { ThemeSwitcher } from './theme-switcher';

interface AccountPanelProps {
  name: string;
  /** Shown for staff; customers have only the one role. */
  role: Role | null;
  /** Called when a link in the panel is followed, so the menu around it can close. */
  onNavigate?: () => void;
}

/** Who is signed in, and what they can do about it: open their account, pick a theme, sign out. */
export function AccountPanel({ name, role, onNavigate }: AccountPanelProps) {
  const t = useTranslations('nav');
  const tTheme = useTranslations('theme');

  return (
    <div className="flex flex-col gap-3" data-testid="account-panel">
      <div className="flex items-center gap-3 px-1">
        <AccountAvatar name={name} className="size-9 text-sm" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="truncate font-medium">{name}</span>
          {role ? <RoleBadge role={role} /> : null}
        </div>
      </div>

      <div className="border-border flex flex-col gap-1 border-t pt-3">
        <Link
          href={PROFILE}
          onClick={onNavigate}
          className="hover:bg-muted focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors outline-none focus-visible:ring-3"
          data-testid="account-link"
        >
          <UserIcon className="text-muted-foreground size-4" aria-hidden />
          {t('account')}
        </Link>
        <div className="flex flex-col gap-1.5 px-2 py-2">
          <span className="text-muted-foreground text-xs">{tTheme('label')}</span>
          <ThemeSwitcher labelled className="w-full" />
        </div>
      </div>

      <div className="border-border border-t pt-3">
        <SignOutButton className="w-full" />
      </div>
    </div>
  );
}
