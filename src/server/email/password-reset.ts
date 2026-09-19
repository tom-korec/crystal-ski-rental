import 'server-only';

import { emailText, renderEmail } from './layout';
import { sendEmail } from './send';

interface PasswordResetEmail {
  to: string;
  name: string;
  /** Better Auth's one-time link, valid for an hour. */
  url: string;
}

/** Sent on request, and never to a seeded demo account: its link would hand over the account (FR-8). */
export async function sendPasswordResetEmail({ to, name, url }: PasswordResetEmail): Promise<void> {
  const { html, text } = renderEmail({
    title: emailText('passwordReset.title'),
    paragraphs: [
      emailText('passwordReset.greeting', { name }),
      emailText('passwordReset.intro'),
      emailText('passwordReset.expiry'),
      emailText('passwordReset.ignore'),
    ],
    action: { label: emailText('passwordReset.action'), url },
  });

  await sendEmail({ to, subject: emailText('passwordReset.subject'), html, text, neverCapture: true });
}
