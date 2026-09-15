import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Badges above the title, e.g. a role or a status. */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** A toolbar under the title, e.g. tabs. */
  children?: ReactNode;
  /** For pages whose content speaks for itself: the title stays for screen readers only. */
  visuallyHidden?: boolean;
}

/** The page title on a card of its own, so it stays readable over the hero. */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  visuallyHidden = false,
}: PageHeaderProps) {
  if (visuallyHidden) {
    return (
      <h1 className="sr-only" data-testid="page-title">
        {title}
      </h1>
    );
  }

  return (
    <header className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-4 shadow-sm ring-1 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="page-title">
            {title}
          </h1>
          {description ? <div className="text-muted-foreground text-sm">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
