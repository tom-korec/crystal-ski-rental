'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

import { isDark, readThemeCookie, type Theme, themeCookie } from '~/lib/theme';
import { cn } from '~/lib/utils';

const THEME_CHANGE_EVENT = 'themechange';

const OPTIONS = [
  { theme: 'light', Icon: SunIcon },
  { theme: 'dark', Icon: MoonIcon },
  { theme: 'system', Icon: MonitorIcon },
] as const satisfies readonly { theme: Theme; Icon: typeof SunIcon }[];

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function selectTheme(theme: Theme) {
  document.cookie = themeCookie(theme);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('dark', isDark(theme, prefersDark));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const t = useTranslations('theme');
  // The server cannot see the cookie, so it renders "system" and the client corrects it after hydration.
  const current = useSyncExternalStore(
    subscribe,
    () => readThemeCookie(document.cookie),
    () => 'system' as const,
  );

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn('border-border inline-flex gap-0.5 rounded-lg border p-0.5', className)}
    >
      {OPTIONS.map(({ theme, Icon }) => (
        <button
          key={theme}
          type="button"
          aria-label={t(theme)}
          aria-pressed={current === theme}
          title={t(theme)}
          onClick={() => selectTheme(theme)}
          className={cn(
            'focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3',
            current === theme
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
