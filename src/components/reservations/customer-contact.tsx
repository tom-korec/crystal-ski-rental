import { MailIcon } from 'lucide-react';

interface CustomerContactProps {
  name: string;
  email: string;
}

export function CustomerContact({ name, email }: CustomerContactProps) {
  return (
    <span className="flex flex-col">
      <span className="font-medium">{name}</span>
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
