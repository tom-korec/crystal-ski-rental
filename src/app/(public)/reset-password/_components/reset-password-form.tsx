'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { MIN_PASSWORD_LENGTH, type PasswordResetInput, passwordResetSchema } from '~/lib/auth-schema';
import { FORGOT_PASSWORD, LANDING } from '~/lib/routes';
import { api } from '~/trpc/react';

interface ResetPasswordFormProps {
  /** Better Auth's one-time token, handed over in the link's query string. */
  token: string | null;
}

/** Sets a new password from the e-mailed link (FR-8). */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const t = useTranslations('auth');
  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { token: token ?? '', password: '' },
  });
  const reset = api.auth.resetPassword.useMutation();

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('resetTitle')}</CardTitle>
          <CardDescription data-testid="reset-invalid">{t('resetLinkInvalid')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="link" className="w-full" nativeButton={false} render={<Link href={FORGOT_PASSWORD} />}>
            {t('forgotPassword')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('resetTitle')}</CardTitle>
        <CardDescription>{t('resetDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {reset.isSuccess ? (
          <p className="text-sm" data-testid="reset-done">
            {t('resetDone')}
          </p>
        ) : (
          <form
            noValidate
            method="post"
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit((values) => reset.mutate(values))}
          >
            <input type="hidden" {...form.register('token')} />
            <Field
              id="reset-password"
              label={t('newPassword')}
              type="password"
              autoComplete="new-password"
              hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })}
              error={form.formState.errors.password && t('errors.newPassword', { min: MIN_PASSWORD_LENGTH })}
              {...form.register('password')}
            />
            <FormError message={reset.error?.message} data-testid="reset-error" />
            <Button type="submit" className="w-full" disabled={reset.isPending} data-testid="reset-submit">
              {reset.isPending ? t('submitting') : t('setPassword')}
            </Button>
          </form>
        )}
        <Button variant="link" className="w-full" nativeButton={false} render={<Link href={LANDING} />}>
          {t('backToSignIn')}
        </Button>
      </CardContent>
    </Card>
  );
}
