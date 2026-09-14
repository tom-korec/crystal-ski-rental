'use client';

import '~/styles/globals.css';

import { TriangleAlertIcon } from 'lucide-react';

import { PageMessage } from '~/components/common/page-message';
import { ThemeScript } from '~/components/layout/theme-script';
import { Button } from '~/components/ui/button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Replaces the root layout when the layout itself throws, so there is no translation provider here:
 * the copy is deliberately literal.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <PageMessage
          icon={<TriangleAlertIcon className="size-8" aria-hidden />}
          title="Something went wrong"
          description="The application failed to load. Try again in a moment."
          footnote={error.digest ? `Reference: ${error.digest}` : undefined}
          actions={<Button onClick={reset}>Try again</Button>}
        />
      </body>
    </html>
  );
}
