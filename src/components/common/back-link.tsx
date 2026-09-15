import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="bg-card text-muted-foreground ring-foreground/10 hover:text-foreground focus-visible:ring-ring/50 inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm shadow-xs ring-1 transition-colors outline-none focus-visible:ring-3"
      data-testid="back-link"
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      {label}
    </Link>
  );
}
