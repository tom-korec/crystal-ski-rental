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
import { handOverGuestCart } from '~/hooks/use-reservation-cart';
import { MIN_PASSWORD_LENGTH, type SignInInput, signInSchema, type SignUpInput, signUpSchema } from '~/lib/auth-schema';
import { isCustomer } from '~/lib/roles';
import { APP_HOME, homeForRole } from '~/lib/routes';
import { cn } from '~/lib/utils';
import { api } from '~/trpc/react';

interface AuthPanelProps {
  /** Where a customer goes once signed in; staff always go to their home (FR-3). */
  customerDestination?: string;
  className?: string;
}

/** Sign in and sign up (FR-1, FR-2). The pages showing it send signed-in visitors on before it renders. */
export function AuthPanel({ customerDestination = APP_HOME, className }: AuthPanelProps) {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  return (
    <Card className={cn('w-full max-w-sm shadow-xl shadow-black/10 dark:shadow-black/40', className)}>
      <CardHeader>
        <CardTitle>{mode === 'signIn' ? t('signInTitle') : t('signUpTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {mode === 'signIn' ? (
          <SignInForm customerDestination={customerDestination} />
        ) : (
          <SignUpForm customerDestination={customerDestination} />
        )}
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

interface AuthFormProps {
  customerDestination: string;
}

/** Lands in the right area straight away (FR-3), rather than bouncing through a guard. */
function useSignedIn(customerDestination: string) {
  const router = useRouter();
  const utils = api.useUtils();

  return async ({ id, role }: { id: string; role?: string | null }) => {
    // Skis a visitor picked before signing in become the customer's reservation.
    if (isCustomer(role)) handOverGuestCart(id);
    await utils.auth.session.invalidate();
    router.replace(isCustomer(role) ? customerDestination : homeForRole(role));
  };
}

function SignInForm({ customerDestination }: AuthFormProps) {
  const t = useTranslations('auth');
  const signedIn = useSignedIn(customerDestination);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });
  const signIn = api.auth.signIn.useMutation({ onSuccess: signedIn });
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

function SignUpForm({ customerDestination }: AuthFormProps) {
  const t = useTranslations('auth');
  const tLegal = useTranslations('legal');
  const signedIn = useSignedIn(customerDestination);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', acceptLegal: false },
  });
  const signUp = api.auth.signUp.useMutation({ onSuccess: signedIn });
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
