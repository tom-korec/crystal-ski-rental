'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { LEGAL_ROUTES } from '~/lib/routes';

interface LegalCheckboxProps extends Omit<ComponentProps<'input'>, 'type'> {
  id: string;
  /** Which sentence to show; its links open the documents in a new tab, so a half-filled form stays. */
  message: 'signUpAgree' | 'bookingAgree' | 'accept.agree';
  error?: string;
}

/** "I accept …" with links to the documents, as a real checkbox (FR-7, FR-37). */
export function LegalCheckbox({ id, message, error, ...input }: LegalCheckboxProps) {
  const t = useTranslations('legal');
  const errorId = `${id}-error`;
  const link = (href: string) =>
    function DocumentLink(chunks: ReactNode) {
      return (
        <Link href={href} target="_blank" rel="noopener" className="text-primary underline underline-offset-4">
          {chunks}
        </Link>
      );
    };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-start gap-2.5 text-sm">
        <input
          id={id}
          type="checkbox"
          className="accent-primary mt-0.5 size-4 shrink-0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          data-testid={id}
          {...input}
        />
        <span>
          {t.rich(message, {
            terms: link(LEGAL_ROUTES.terms),
            privacy: link(LEGAL_ROUTES.privacy),
            agreement: link(LEGAL_ROUTES.rentalAgreement),
          })}
        </span>
      </label>
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
