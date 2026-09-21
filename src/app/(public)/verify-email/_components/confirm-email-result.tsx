'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { type VerificationRequestInput, verificationRequestSchema } from '~/lib/auth-schema';
import { SIGN_IN } from '~/lib/routes';
import { api } from '~/trpc/react';

interface ConfirmEmailResultProps {
  confirmed: boolean;
}

/** The end of the confirmation link (FR-9): signing in from here, or asking for a fresh link. */
export function ConfirmEmailResult({ confirmed }: ConfirmEmailResultProps) {
  const t = useTranslations('auth');
  const resend = api.auth.resendConfirmation.useMutation();
  const form = useForm<VerificationRequestInput>({
    resolver: zodResolver(verificationRequestSchema),
    defaultValues: { email: '' },
  });

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('confirmTitle')}</CardTitle>
        <CardDescription data-testid={confirmed ? 'confirm-done' : 'confirm-invalid'}>
          {confirmed ? t('confirmDone') : t('confirmInvalid')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!confirmed &&
          (resend.isSuccess ? (
            <p className="text-sm" data-testid="confirm-resent">
              {t('confirmResent')}
            </p>
          ) : (
            <form
              noValidate
              method="post"
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit((values) => resend.mutate(values))}
            >
              <Field
                id="confirm-email"
                label={t('email')}
                type="email"
                autoComplete="email"
                error={form.formState.errors.email && t('errors.email')}
                {...form.register('email')}
              />
              <FormError message={resend.error?.message} data-testid="confirm-error" />
              <Button type="submit" className="w-full" disabled={resend.isPending} data-testid="confirm-resend">
                {resend.isPending ? t('submitting') : t('confirmResend')}
              </Button>
            </form>
          ))}
        <Button variant="link" className="w-full" nativeButton={false} render={<Link href={SIGN_IN} />}>
          {t('backToSignIn')}
        </Button>
      </CardContent>
    </Card>
  );
}
