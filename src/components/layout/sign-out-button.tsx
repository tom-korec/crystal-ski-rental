'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { LogOutIcon } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { LANDING } from '~/lib/routes';
import { api } from '~/trpc/react';

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
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
      className={className}
      onClick={() => signOut.mutate()}
      disabled={signOut.isPending}
      data-testid="sign-out"
    >
      <LogOutIcon aria-hidden />
      {t('signOut')}
    </Button>
  );
}
