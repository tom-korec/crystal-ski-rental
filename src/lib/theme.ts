export const THEMES = ['light', 'dark', 'system'] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = 'theme';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function parseTheme(value: string | null | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? 'system';
}

export function readThemeCookie(cookie: string): Theme {
  const match = new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`).exec(cookie);

  return parseTheme(match?.[1]);
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
}

export function isDark(theme: Theme, prefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark);
}
