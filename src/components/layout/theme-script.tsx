import { THEME_COOKIE } from '~/lib/theme';

/**
 * Applies the saved theme before the first paint, so a dark-theme visitor never sees a flash of the
 * light page. It runs before React loads, which is why it duplicates the rules in `~/lib/theme`.
 * It also follows the OS setting while the theme is "system", reading the cookie on every change so
 * a switch made after load is respected.
 */
const script = `(() => {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const match = /(?:^|; )${THEME_COOKIE}=(light|dark|system)/.exec(document.cookie);
    const theme = match ? match[1] : 'system';
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches));
  };
  apply();
  media.addEventListener('change', apply);
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
