import { getFormatter, getTranslations } from 'next-intl/server';

import { PageHeader } from '~/components/common/page-header';
import { Card, CardContent } from '~/components/ui/card';
import { toUtcDate } from '~/lib/date';
import { type LegalDocument as Document, LEGAL_VERSIONS } from '~/lib/legal';

interface Section {
  heading: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  document: Document;
}

/** One legal document as a page: the example notice, its version, a table of contents and the text (FR-7). */
export async function LegalDocument({ document }: LegalDocumentProps) {
  const t = await getTranslations('legal');
  const format = await getFormatter();
  const sections = t.raw(`${document}.sections`) as Section[];
  const anchor = (heading: string) =>
    heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  return (
    <article className="flex flex-col gap-6" data-testid={`legal-${document}`}>
      <PageHeader
        title={t(`${document}.title`)}
        description={t(`${document}.summary`)}
        eyebrow={
          <span className="text-muted-foreground text-xs" data-testid="legal-version">
            {t('effective', {
              date: format.dateTime(toUtcDate(LEGAL_VERSIONS[document]), { dateStyle: 'long', timeZone: 'UTC' }),
            })}
          </span>
        }
      >
        <p className="bg-highlight/15 rounded-lg px-3 py-2 text-sm" role="note">
          {t('exampleNotice')}
        </p>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label={t('contents')}
          className="bg-card ring-foreground/10 rounded-xl p-4 text-sm ring-1 lg:sticky lg:top-24"
        >
          <p className="mb-2 font-medium">{t('contents')}</p>
          <ol className="flex flex-col gap-1.5">
            {sections.map((section) => (
              <li key={section.heading}>
                <a href={`#${anchor(section.heading)}`} className="text-muted-foreground hover:text-foreground">
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <Card>
          <CardContent className="flex max-w-3xl flex-col gap-6">
            {sections.map((section) => (
              <section key={section.heading} id={anchor(section.heading)} className="flex scroll-mt-24 flex-col gap-2">
                <h2 className="text-lg font-semibold">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </article>
  );
}
