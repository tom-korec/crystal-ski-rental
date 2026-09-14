import type { ReactNode } from 'react';

import { AppShell } from '~/components/layout/app-shell';
import { requireStaff } from '~/server/better-auth/guards';

export default async function StaffLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireStaff();

  return (
    <AppShell name={user.name} role={user.role}>
      {children}
    </AppShell>
  );
}
