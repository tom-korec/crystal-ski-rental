import 'server-only';

import { createTranslator } from 'next-intl';

import messages from '../../../messages/en.json';
import { DEFAULT_LOCALE } from '~/i18n/config';

/**
 * E-mails are rendered outside a request, so they build their own translator instead of the one
 * `next-intl` keeps per request (NFR-4).
 */
export const emailText = createTranslator({ locale: DEFAULT_LOCALE, messages, namespace: 'emails' });

export interface EmailBody {
  title: string;
  /** One paragraph each. */
  paragraphs: string[];
  action?: { label: string; url: string };
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * One plain layout for every e-mail: inline styles, a single column and no images, because mail
 * clients strip stylesheets and block remote content.
 */
export function renderEmail(body: EmailBody): { html: string; text: string } {
  const paragraphs = body.paragraphs
    .map((text) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${escape(text)}</p>`)
    .join('');

  const action = body.action
    ? `<p style="margin:24px 0;">
         <a href="${escape(body.action.url)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#0b6bcb;color:#ffffff;font-weight:600;text-decoration:none;">${escape(body.action.label)}</a>
       </p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#5b6472;">${escape(emailText('linkFallback'))}<br />
         <a href="${escape(body.action.url)}" style="color:#0b6bcb;word-break:break-all;">${escape(body.action.url)}</a>
       </p>`
    : '';

  const html = `<!doctype html>
<html lang="${DEFAULT_LOCALE}">
  <body style="margin:0;padding:24px;background:#f3f8fc;color:#101b2b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 24px;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#0b6bcb;">${escape(emailText('brand'))}</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escape(body.title)}</h1>
          ${paragraphs}
          ${action}
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#5b6472;">${escape(emailText('signature'))}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    emailText('brand'),
    '',
    body.title,
    '',
    ...body.paragraphs,
    ...(body.action ? ['', body.action.label, body.action.url] : []),
    '',
    emailText('signature'),
  ].join('\n');

  return { html, text };
}
