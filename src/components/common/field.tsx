import type { ComponentProps } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

interface FieldProps extends ComponentProps<typeof Input> {
  /** Ties the label, the input and the error together, and doubles as a stable test selector. */
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

/** A labelled input whose error is announced with it, through `aria-describedby` (NFR-1). */
export function Field({ id, label, error, hint, ...props }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props} />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
