import { useTranslations } from 'next-intl';

import { Logo } from '~/components/layout/logo';
import { ThemeSwitcher } from '~/components/layout/theme-switcher';

export default function Home() {
  const t = useTranslations('home');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Logo className="scale-150" />
      <p className="text-muted-foreground text-lg">{t('comingSoon')}</p>
      <ThemeSwitcher />
    </main>
  );
}
