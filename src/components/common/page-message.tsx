import type { ReactNode } from 'react';

interface PageMessageProps {
  icon: ReactNode;
  title: string;
  description: string;
  footnote?: string;
  actions: ReactNode;
}

/** A full-page notice with a way forward, for error and not-found pages. */
export function PageMessage({ icon, title, description, footnote, actions }: PageMessageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="bg-secondary text-secondary-foreground flex size-16 items-center justify-center rounded-full">
        {icon}
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-balance">{description}</p>
        {footnote ? <p className="text-muted-foreground font-mono text-xs">{footnote}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </main>
  );
}
