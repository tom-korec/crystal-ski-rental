import 'server-only';

import { emailText, renderEmail } from './layout';
import { sendEmail } from './send';

interface VerificationEmail {
  to: string;
  name: string;
  /** Better Auth's one-time link, valid for an hour. */
  url: string;
}

/** Sent on sign-up and on request, until the address is confirmed and the account can sign in (FR-9). */
export async function sendVerificationEmail({ to, name, url }: VerificationEmail): Promise<void> {
  const { html, text } = renderEmail({
    title: emailText('verifyEmail.title'),
    paragraphs: [
      emailText('verifyEmail.greeting', { name }),
      emailText('verifyEmail.intro'),
      emailText('verifyEmail.expiry'),
      emailText('verifyEmail.ignore'),
    ],
    action: { label: emailText('verifyEmail.action'), url },
  });

  await sendEmail({ to, subject: emailText('verifyEmail.subject'), html, text });
}
