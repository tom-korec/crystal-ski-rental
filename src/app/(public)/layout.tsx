import type { ReactNode } from 'react';

import { AppShell } from '~/components/layout/app-shell';
import { ShopRoutesProvider } from '~/components/layout/shop-routes';
import { getSession } from '~/server/better-auth/server';

/** Pages anyone can open: the search, the stores and the legal documents, framed for whoever is looking. */
export default async function PublicLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = (await getSession())?.user;
  const account = user && !user.deletedAt ? user : null;

  return (
    <AppShell account={account}>
      <ShopRoutesProvider area={account ? 'app' : 'public'}>{children}</ShopRoutesProvider>
    </AppShell>
  );
}
