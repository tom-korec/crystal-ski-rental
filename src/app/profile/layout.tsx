import type { ReactNode } from 'react';

import { AppShell } from '~/components/layout/app-shell';
import { requireUser } from '~/server/better-auth/guards';

export default async function ProfileLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();

  return <AppShell account={user}>{children}</AppShell>;
}
