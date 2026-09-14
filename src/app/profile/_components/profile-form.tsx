'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { type ProfileUpdateInput, profileUpdateSchema } from '~/lib/profile-schema';
import { api } from '~/trpc/react';

interface ProfileFormProps {
  name: string;
  email: string;
}

/** The name can change; the e-mail is the sign-in identifier and nothing verifies a new one (FR-4). */
export function ProfileForm({ name, email }: ProfileFormProps) {
  const t = useTranslations('profile');
  const router = useRouter();
  const form = useForm<ProfileUpdateInput>({ resolver: zodResolver(profileUpdateSchema), defaultValues: { name } });
  const update = api.auth.updateProfile.useMutation({
    onSuccess: ({ name: saved }) => {
      form.reset({ name: saved });
      // The header shows the name too, and it comes from the server.
      router.refresh();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('detailsTitle')}</h2>
        </CardTitle>
        <CardDescription>{t('detailsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((values) => update.mutate(values))}
        >
          <Field
            id="profile-name"
            label={t('name')}
            autoComplete="name"
            error={form.formState.errors.name && t('errors.name')}
            {...form.register('name')}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-email">{t('email')}</Label>
            <Input id="profile-email" value={email} readOnly disabled aria-describedby="profile-email-hint" />
            <p id="profile-email-hint" className="text-muted-foreground text-xs">
              {t('emailHint')}
            </p>
          </div>
          <FormError message={update.error?.message} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty} data-testid="save-profile">
              {update.isPending ? t('saving') : t('save')}
            </Button>
            {update.isSuccess && !form.formState.isDirty ? (
              <p role="status" className="text-muted-foreground text-sm">
                {t('saved')}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
