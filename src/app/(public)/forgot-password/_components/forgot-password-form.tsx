'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { type PasswordResetRequestInput, passwordResetRequestSchema } from '~/lib/auth-schema';
import { SIGN_IN } from '~/lib/routes';
import { api } from '~/trpc/react';

/** Asks for a reset link (FR-8). The confirmation never says whether the address has an account. */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email: '' },
  });
  const request = api.auth.requestPasswordReset.useMutation();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('forgotTitle')}</CardTitle>
        <CardDescription>{t('forgotDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {request.isSuccess ? (
          <p className="text-sm" data-testid="reset-requested">
            {t('resetLinkSent')}
          </p>
        ) : (
          <form
            noValidate
            method="post"
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => request.mutate(values))}
          >
            <Field
              id="forgot-email"
              label={t('email')}
              type="email"
              autoComplete="email"
              error={form.formState.errors.email && t('errors.email')}
              {...form.register('email')}
            />
            <FormError message={request.error?.message} data-testid="reset-error" />
            <Button type="submit" className="w-full" disabled={request.isPending} data-testid="reset-submit">
              {request.isPending ? t('submitting') : t('sendResetLink')}
            </Button>
          </form>
        )}
        <Button variant="link" className="w-full" nativeButton={false} render={<Link href={SIGN_IN} />}>
          {t('backToSignIn')}
        </Button>
      </CardContent>
    </Card>
  );
}
