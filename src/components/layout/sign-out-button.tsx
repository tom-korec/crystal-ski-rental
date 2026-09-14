'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '~/components/ui/button';
import { LANDING } from '~/lib/routes';
import { api } from '~/trpc/react';

export function SignOutButton() {
  const t = useTranslations('auth');
  const router = useRouter();
  const utils = api.useUtils();

  const signOut = api.auth.signOut.useMutation({
    onSuccess: async () => {
      await utils.auth.session.invalidate();
      router.replace(LANDING);
    },
  });

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => signOut.mutate()}
      disabled={signOut.isPending}
      data-testid="sign-out"
    >
      {t('signOut')}
    </Button>
  );
}
