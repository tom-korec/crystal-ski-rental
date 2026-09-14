'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { MIN_PASSWORD_LENGTH } from '~/lib/auth-schema';
import { type PasswordChangeFormInput, passwordChangeFormSchema } from '~/lib/profile-schema';
import { api } from '~/trpc/react';

/** Change the password; other devices are signed out, this one stays signed in (FR-4). */
export function PasswordForm() {
  const t = useTranslations('profile');
  const form = useForm<PasswordChangeFormInput>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { errors } = form.formState;
  const change = api.auth.changePassword.useMutation({ onSuccess: () => form.reset() });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('passwordTitle')}</h2>
        </CardTitle>
        <CardDescription>{t('passwordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          method="post"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(({ currentPassword, newPassword }) =>
            change.mutate({ currentPassword, newPassword }),
          )}
        >
          <Field
            id="current-password"
            label={t('currentPassword')}
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword && t('errors.currentPassword')}
            {...form.register('currentPassword')}
          />
          <Field
            id="new-password"
            label={t('newPassword')}
            type="password"
            autoComplete="new-password"
            hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })}
            error={errors.newPassword && t('errors.newPassword', { min: MIN_PASSWORD_LENGTH })}
            {...form.register('newPassword')}
          />
          <Field
            id="confirm-password"
            label={t('confirmPassword')}
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword && t('errors.confirmPassword')}
            {...form.register('confirmPassword')}
          />
          <FormError message={change.error?.message} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={change.isPending} data-testid="change-password">
              {change.isPending ? t('saving') : t('changePassword')}
            </Button>
            {change.isSuccess ? (
              <p role="status" className="text-muted-foreground text-sm">
                {t('passwordChanged')}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
