import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LEGAL_DOCUMENTS } from '~/lib/legal';
import { LEGAL_ROUTES } from '~/lib/routes';

/** The legal documents, on every page (FR-7). */
export async function SiteFooter() {
  const t = await getTranslations('legal');
  const tApp = await getTranslations('app');

  return (
    <footer className="border-border/60 bg-card/60 relative border-t backdrop-blur" data-testid="site-footer">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 text-sm sm:px-6">
        <p className="text-muted-foreground">
          © {new Date().getFullYear()} {tApp('name')}
        </p>
        <nav aria-label={t('footer')} className="flex flex-wrap gap-x-5 gap-y-1">
          {LEGAL_DOCUMENTS.map((document) => (
            <Link
              key={document}
              href={LEGAL_ROUTES[document]}
              className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              data-testid={`footer-${document}`}
            >
              {t(`links.${document}`)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
