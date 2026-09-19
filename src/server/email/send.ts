import 'server-only';

import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '~/env';
import { type DeliveryPolicy, resolveDelivery } from '~/lib/email-address';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Mail that must never reach a capture inbox, such as a password reset. */
  neverCapture?: boolean;
}

export type SendResult = 'sent' | 'captured' | 'skipped';

/** Without a host and a sender there is nowhere to send: the features that need e-mail stay hidden. */
export function isEmailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.EMAIL_FROM);
}

let transporter: Transporter | undefined;

function transport(host: string): Transporter {
  transporter ??= nodemailer.createTransport({
    host,
    port: env.SMTP_PORT,
    // 465 is TLS from the first byte; 587 and Mailpit's 1025 start in the clear and upgrade.
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    // A mail server that hangs must not hold a serverless function open until the platform kills it.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

function policy(neverCapture: boolean | undefined): DeliveryPolicy {
  return {
    captureAddress: env.EMAIL_CAPTURE_ADDRESS,
    neverCapture,
    // A local catch-all (Mailpit) delivers to nobody, so demo addresses can be tested against it.
    allowUndeliverable: env.NODE_ENV !== 'production',
  };
}

/**
 * Sends one message, or explains in the log why it did not. Never throws: a booking or a sign-up must
 * not fail because the mail server is slow or down. Call it from `after()` so nobody waits for it.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const host = env.SMTP_HOST;
  if (!host || !env.EMAIL_FROM) {
    console.info(`E-mail not configured; "${message.subject}" was not sent.`);
    return 'skipped';
  }

  const delivery = resolveDelivery(message.to, policy(message.neverCapture));

  if (delivery.kind === 'skip') {
    console.info(`E-mail to ${message.to} skipped: ${delivery.reason}.`);
    return 'skipped';
  }

  const subject = delivery.kind === 'capture' ? `${delivery.subjectPrefix}${message.subject}` : message.subject;

  try {
    await transport(host).sendMail({
      from: env.EMAIL_FROM,
      replyTo: env.EMAIL_REPLY_TO,
      to: delivery.to,
      subject,
      text: message.text,
      html: message.html,
    });

    return delivery.kind === 'capture' ? 'captured' : 'sent';
  } catch (error) {
    console.error(`Sending "${message.subject}" failed:`, error);
    return 'skipped';
  }
}
