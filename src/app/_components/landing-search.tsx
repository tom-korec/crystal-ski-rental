'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CustomerSearch, type CustomerSearchValue } from '~/components/skis/customer-search';
import { type SearchState, serialiseSearch } from '~/components/skis/search-params';
import { SEARCH } from '~/lib/routes';
import { skiSearchFiltersSchema } from '~/lib/ski-schema';

/** The landing page's search: the same step customers start with, which hands over to the results page. */
export function LandingSearch() {
  const router = useRouter();
  const [state, setState] = useState<SearchState>({ filters: skiSearchFiltersSchema.parse({}) });

  const search = (value: CustomerSearchValue) => {
    setState(value);
    router.push(`${SEARCH}?${serialiseSearch(value).toString()}`);
  };

  return (
    <CustomerSearch
      variant="start"
      storeId={state.storeId}
      range={state.range}
      filters={state.filters}
      onSearch={search}
    />
  );
}
