import type { ReactNode } from 'react';

import { AppShell } from '~/components/layout/app-shell';
import { StaffActorProvider } from '~/components/layout/staff-actor';
import { requireStaff } from '~/server/better-auth/guards';

export default async function StaffLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireStaff();

  return (
    <AppShell account={user}>
      <StaffActorProvider actor={{ role: user.role, storeId: user.storeId }}>{children}</StaffActorProvider>
    </AppShell>
  );
}
