import type { ReactNode } from 'react';

import { AppShell } from '~/components/layout/app-shell';
import { requireCustomer } from '~/server/better-auth/guards';

export default async function CustomerLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireCustomer();

  return <AppShell account={user}>{children}</AppShell>;
}
