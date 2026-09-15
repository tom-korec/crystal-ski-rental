import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { AppShell } from '~/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { hasAcceptedCurrentTerms } from '~/lib/legal';
import { isStaff } from '~/lib/roles';
import { homeForRole } from '~/lib/routes';
import { requireUser } from '~/server/better-auth/guards';

import { AcceptTermsForm } from './_components/accept-terms-form';

/** Where a customer lands after sign-in until they accept the current Terms and Privacy policy (FR-7). */
export default async function AcceptTermsPage() {
  const user = await requireUser({ allowPendingTerms: true });
  if (isStaff(user.role) || hasAcceptedCurrentTerms(user)) redirect(homeForRole(user.role));

  const t = await getTranslations('legal.accept');

  return (
    <AppShell name={user.name} role={user.role} navigation={false}>
      <Card className="mx-auto w-full max-w-xl" data-testid="accept-terms">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl">{t('title')}</h1>
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptTermsForm home={homeForRole(user.role)} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
