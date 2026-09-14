'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UseUrlFiltersOptions<TFilters> {
  /** The URL is user-editable and outlives the session, so it is parsed as untrusted input. */
  parse: (params: URLSearchParams) => TFilters;
  serialise: (filters: TFilters) => URLSearchParams;
}

/** View state kept in the query string, so a list can be reloaded, shared and bookmarked (FR-35). */
export function useUrlFilters<TFilters>({ parse, serialise }: UseUrlFiltersOptions<TFilters>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return {
    filters: parse(searchParams),
    /**
     * Replaces the whole view state. `replace`, not `push`, so Back leaves the screen instead of
     * stepping through every filter change.
     */
    apply: (next: TFilters) => {
      const query = serialise(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
  };
}
