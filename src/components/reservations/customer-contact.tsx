import { MailIcon } from 'lucide-react';
import Link from 'next/link';

interface CustomerContactProps {
  name: string;
  email: string;
  /** The customer's account page, when the viewer may open it. */
  href?: string;
}

export function CustomerContact({ name, email, href }: CustomerContactProps) {
  return (
    <span className="flex flex-col">
      {href ? (
        <Link
          href={href}
          className="hover:text-primary w-fit font-medium underline-offset-4 hover:underline"
          data-testid="customer-link"
        >
          {name}
        </Link>
      ) : (
        <span className="font-medium">{name}</span>
      )}
      <a
        href={`mailto:${email}`}
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs break-all underline-offset-4 hover:underline"
      >
        <MailIcon className="size-3 shrink-0" aria-hidden />
        {email}
      </a>
    </span>
  );
}
