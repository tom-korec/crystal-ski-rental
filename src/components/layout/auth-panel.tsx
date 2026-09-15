'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Field } from '~/components/common/field';
import { LegalCheckbox } from '~/components/legal/legal-checkbox';
import { FormError } from '~/components/common/form-error';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { MIN_PASSWORD_LENGTH, type SignInInput, signInSchema, type SignUpInput, signUpSchema } from '~/lib/auth-schema';
import { APP_HOME, homeForRole } from '~/lib/routes';
import { api } from '~/trpc/react';

/** Sign in and sign up (FR-1, FR-2). The landing page sends signed-in visitors on before this renders. */
export function AuthPanel() {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  return (
    <Card className="w-full max-w-sm shadow-xl shadow-black/10 dark:shadow-black/40">
      <CardHeader>
        <CardTitle>{mode === 'signIn' ? t('signInTitle') : t('signUpTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
        <Button
          type="button"
          variant="link"
          className="w-full"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          data-testid="auth-switch"
        >
          {mode === 'signIn' ? t('switchToSignUp') : t('switchToSignIn')}
        </Button>
      </CardContent>
    </Card>
  );
}

function useSignedIn() {
  const router = useRouter();
  const utils = api.useUtils();

  return async (destination: string) => {
    await utils.auth.session.invalidate();
    router.replace(destination);
  };
}

function SignInForm() {
  const t = useTranslations('auth');
  const goTo = useSignedIn();
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  // Land in the right area straight away (FR-3), rather than bouncing through a guard.
  const signIn = api.auth.signIn.useMutation({ onSuccess: ({ role }) => goTo(homeForRole(role)) });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      // Before hydration a click submits natively; POST keeps the password out of the URL.
      method="post"
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
    >
      <Field
        id="signin-email"
        label={t('email')}
        type="email"
        autoComplete="email"
        error={errors.email && t('errors.email')}
        {...form.register('email')}
      />
      <Field
        id="signin-password"
        label={t('password')}
        type="password"
        autoComplete="current-password"
        error={errors.password && t('errors.passwordRequired')}
        {...form.register('password')}
      />
      <FormError message={signIn.error?.message} data-testid="auth-error" />
      <Button type="submit" className="w-full" disabled={signIn.isPending} data-testid="signin-submit">
        {signIn.isPending ? t('submitting') : t('signIn')}
      </Button>
    </form>
  );
}

function SignUpForm() {
  const t = useTranslations('auth');
  const tLegal = useTranslations('legal');
  const goTo = useSignedIn();
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', acceptLegal: false },
  });
  const signUp = api.auth.signUp.useMutation({ onSuccess: () => goTo(APP_HOME) });
  const { errors } = form.formState;

  return (
    <form
      noValidate
      method="post"
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => signUp.mutate(values))}
    >
      <Field
        id="signup-name"
        label={t('name')}
        autoComplete="name"
        error={errors.name && t('errors.name')}
        {...form.register('name')}
      />
      <Field
        id="signup-email"
        label={t('email')}
        type="email"
        autoComplete="email"
        error={errors.email && t('errors.email')}
        {...form.register('email')}
      />
      <Field
        id="signup-password"
        label={t('password')}
        type="password"
        autoComplete="new-password"
        hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })}
        error={errors.password && t('errors.password', { min: MIN_PASSWORD_LENGTH })}
        {...form.register('password')}
      />
      <LegalCheckbox
        id="signup-accept"
        message="signUpAgree"
        error={errors.acceptLegal ? tLegal('signUpRequired') : undefined}
        {...form.register('acceptLegal')}
      />
      <FormError message={signUp.error?.message} data-testid="auth-error" />
      <Button type="submit" className="w-full" disabled={signUp.isPending} data-testid="signup-submit">
        {signUp.isPending ? t('submitting') : t('signUp')}
      </Button>
    </form>
  );
}
