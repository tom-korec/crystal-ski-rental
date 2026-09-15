'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { FormError } from '~/components/common/form-error';
import { SignOutButton } from '~/components/layout/sign-out-button';
import { LegalCheckbox } from '~/components/legal/legal-checkbox';
import { Button } from '~/components/ui/button';
import { api } from '~/trpc/react';

interface AcceptTermsFormProps {
  /** Where the customer continues once they accept. */
  home: string;
}

export function AcceptTermsForm({ home }: AcceptTermsFormProps) {
  const t = useTranslations('legal');
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const accept = api.auth.acceptLegal.useMutation({
    onSuccess: () => {
      router.replace(home);
      router.refresh();
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (accepted) accept.mutate();
      }}
    >
      <LegalCheckbox
        id="accept-legal"
        message="accept.agree"
        checked={accepted}
        onChange={(event) => setAccepted(event.target.checked)}
        error={submitted && !accepted ? t('accept.required') : undefined}
      />
      <FormError message={accept.error?.message} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SignOutButton />
        <Button type="submit" disabled={accept.isPending} data-testid="accept-legal-submit">
          {accept.isPending ? t('accept.saving') : t('accept.continue')}
        </Button>
      </div>
    </form>
  );
}
