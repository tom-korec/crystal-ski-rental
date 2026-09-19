/**
 * Reserved top-level domains (RFC 2606, RFC 6761). The seeded demo accounts use them, so mail to
 * them can never be delivered: sending it anyway would bounce and cost the domain its reputation.
 */
const RESERVED_TLDS = ['test', 'example', 'invalid', 'localhost'];
const RESERVED_DOMAINS = ['example.com', 'example.net', 'example.org'];

export function isReservedEmailDomain(email: string): boolean {
  const domain = email.split('@').at(-1)?.toLowerCase() ?? '';

  return RESERVED_DOMAINS.includes(domain) || RESERVED_TLDS.some((tld) => domain === tld || domain.endsWith(`.${tld}`));
}

export type EmailDelivery =
  | { kind: 'send'; to: string }
  /** Sent to a capture inbox instead of the address, which only the owner can read. */
  | { kind: 'capture'; to: string; subjectPrefix: string }
  | { kind: 'skip'; reason: string };

export interface DeliveryPolicy {
  /** Where mail for reserved domains goes instead, e.g. Resend's `delivered@resend.dev`. */
  captureAddress?: string;
  /**
   * Mail that must never be captured because reading it is enough to take the account over, such as
   * a password reset. Every seeded account shares one public password, so its resets go nowhere.
   */
  neverCapture?: boolean;
  /** Without a capture address, reserved domains may only be attempted against a local catch-all. */
  allowUndeliverable?: boolean;
}

/** Decides where one message goes, before any transport is involved. */
export function resolveDelivery(to: string, policy: DeliveryPolicy = {}): EmailDelivery {
  if (!isReservedEmailDomain(to)) return { kind: 'send', to };

  if (policy.neverCapture) return { kind: 'skip', reason: 'reserved domain, not captured' };

  if (policy.captureAddress) {
    return { kind: 'capture', to: captureRecipient(policy.captureAddress, to), subjectPrefix: `[to ${to}] ` };
  }

  return policy.allowUndeliverable
    ? { kind: 'send', to }
    : { kind: 'skip', reason: 'reserved domain, nowhere to capture' };
}

/** Labels the capture address with the original recipient, so one inbox stays readable: `delivered+a-b-test@…`. */
function captureRecipient(captureAddress: string, original: string): string {
  const [local, domain] = captureAddress.split('@');
  if (!local || !domain) return captureAddress;

  const label = original
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  return `${local}+${label}@${domain}`;
}
