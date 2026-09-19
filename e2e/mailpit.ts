/**
 * Mailpit catches every e-mail the app sends during the suite and delivers none of it, so a test can
 * read what a customer would have received.
 */
import { expect } from '@playwright/test';

import { mailpitUrl } from './test-env';

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
}

/** Empties the inbox, so a test only ever sees its own e-mail. */
export async function clearMailbox(): Promise<void> {
  const response = await fetch(`${mailpitUrl}/api/v1/messages`, { method: 'DELETE' });

  if (!response.ok) throw new Error(`Mailpit is not reachable at ${mailpitUrl} (${response.status}).`);
}

/** Waits for the newest message to a recipient and returns its plain-text body. */
export async function waitForEmail(to: string): Promise<{ subject: string; text: string }> {
  let message: MailpitSummary | undefined;

  await expect
    .poll(
      async () => {
        const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=50`);
        const { messages } = (await response.json()) as { messages: MailpitSummary[] };
        message = messages.find((candidate) => candidate.To.some((recipient) => recipient.Address === to));

        return Boolean(message);
      },
      { timeout: 15_000, message: `No e-mail to ${to} arrived in Mailpit.` },
    )
    .toBe(true);

  if (!message) throw new Error(`No e-mail to ${to} arrived in Mailpit.`);

  const response = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
  const body = (await response.json()) as { Subject: string; Text: string };

  return { subject: body.Subject, text: body.Text };
}

/** The first link in an e-mail, which is the one its button points at. */
export function linkIn(text: string): string {
  const link = /https?:\/\/\S+/.exec(text)?.[0];

  if (!link) throw new Error(`No link found in the e-mail:\n${text}`);

  return link.replace(/[).,]+$/, '');
}
