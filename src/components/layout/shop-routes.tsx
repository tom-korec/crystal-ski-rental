'use client';

import { createContext, type ReactNode, use } from 'react';

import { SHOP_ROUTES, type ShopArea, type ShopRoutes } from '~/lib/routes';

const ShopRoutesContext = createContext<ShopRoutes>(SHOP_ROUTES.app);

interface ShopRoutesProviderProps {
  area: ShopArea;
  children: ReactNode;
}

/** Which search, stores and reservation pages the shared shop screens link to: public, or the customer's. */
export function ShopRoutesProvider({ area, children }: ShopRoutesProviderProps) {
  return <ShopRoutesContext value={SHOP_ROUTES[area]}>{children}</ShopRoutesContext>;
}

export function useShopRoutes(): ShopRoutes {
  return use(ShopRoutesContext);
}
