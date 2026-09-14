import type { ComponentProps } from 'react';

interface FormErrorProps extends ComponentProps<'p'> {
  message?: string;
}

/** The error a mutation returns, announced when it appears. Renders nothing without a message. */
export function FormError({ message, ...props }: FormErrorProps) {
  if (!message) return null;

  return (
    <p role="alert" className="text-destructive text-sm" {...props}>
      {message}
    </p>
  );
}
