'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { env } from '~/env';
import { DEMO_ACCOUNTS } from '~/lib/demo';
import { homeForRole } from '~/lib/routes';
import { api } from '~/trpc/react';

/** One click into each role of the public demo. */
export function DemoAccounts() {
  const t = useTranslations('demo');
  const tRoles = useTranslations('roles');
  const router = useRouter();
  const utils = api.useUtils();
  const signIn = api.auth.signIn.useMutation({
    onSuccess: async ({ role }) => {
      await utils.auth.session.invalidate();
      router.replace(homeForRole(role));
    },
  });

  if (!env.NEXT_PUBLIC_DEMO_MODE) return null;

  return (
    <Card className="w-full max-w-sm" data-testid="demo-accounts">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              variant="secondary"
              disabled={signIn.isPending}
              onClick={() => signIn.mutate({ email: account.email, password: account.password })}
              data-testid={`demo-${account.role.toLowerCase()}`}
            >
              {tRoles(account.role)}
            </Button>
          ))}
        </div>
        <FormError message={signIn.error?.message} />
      </CardContent>
    </Card>
  );
}
