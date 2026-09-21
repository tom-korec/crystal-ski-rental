import 'server-only';

import { type EmailMessage, isEmailConfigured, type SendResult, sendEmail } from '~/server/email/send';

/**
 * The transport as a dependency, so a service that sends mail can be tested without one. Which
 * addresses a message may reach stays in `~/lib/email-address`, below this.
 */
export class Mailer {
  /** Features that need e-mail say so instead of failing when there is no mail server (FR-8, FR-9). */
  get isConfigured(): boolean {
    return isEmailConfigured();
  }

  send(message: EmailMessage): Promise<SendResult> {
    return sendEmail(message);
  }
}
