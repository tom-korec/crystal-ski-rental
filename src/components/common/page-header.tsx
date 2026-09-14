import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** For pages whose content speaks for itself: the title stays for screen readers only. */
  visuallyHidden?: boolean;
}

export function PageHeader({ title, description, actions, visuallyHidden = false }: PageHeaderProps) {
  if (visuallyHidden) {
    return (
      <h1 className="sr-only" data-testid="page-title">
        {title}
      </h1>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="page-title">
          {title}
        </h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
