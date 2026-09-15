import { z } from 'zod';

import { type DateRange, rentalRangeSchema } from '~/lib/rental-range';
import { SEARCH_PARAMS as P } from '~/lib/routes';
import { type SkiSearchFilters, skiSearchFiltersSchema, type SkiSearchInput } from '~/lib/ski-schema';

/** What the search page keeps in the URL. The store and the dates stay empty until the customer picks them. */
export interface SearchState {
  storeId?: string;
  range?: DateRange;
  filters: SkiSearchFilters;
}

function numberParam(params: URLSearchParams, name: string): number | undefined {
  const value = params.get(name);
  return value === null || value === '' ? undefined : Number(value);
}

/**
 * The URL is untrusted, so each part goes through the router's own schemas and is dropped on its own when
 * it does not survive. Dates that are no longer bookable are dropped too, which sends the customer back to
 * picking them rather than showing a search for the past.
 */
export function parseSearch(params: URLSearchParams): SearchState {
  const store = z.uuid().safeParse(params.get(P.store));
  const range = rentalRangeSchema.safeParse({ startDate: params.get(P.from), endDate: params.get(P.to) });

  const candidate: Record<string, unknown> = {
    brandId: params.get(P.brand) ?? undefined,
    modelId: params.get(P.model) ?? undefined,
    type: params.get(P.type) ?? undefined,
    gender: params.get(P.gender) ?? undefined,
    skillLevel: params.get(P.level) ?? undefined,
    minLengthCm: numberParam(params, P.minLength),
    maxLengthCm: numberParam(params, P.maxLength),
    maxPricePerDay: params.get(P.maxPrice) ?? undefined,
    minRating: numberParam(params, P.rating),
    sort: params.get(P.sort) ?? undefined,
  };

  const parsed = skiSearchFiltersSchema.safeParse(candidate);
  let filters: SkiSearchFilters;

  if (parsed.success) {
    filters = parsed.data;
  } else {
    const invalid = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
    filters = skiSearchFiltersSchema.parse(
      Object.fromEntries(Object.entries(candidate).filter(([key]) => !invalid.has(key))),
    );
  }

  return {
    storeId: store.success ? store.data : undefined,
    range: range.success ? range.data : undefined,
    filters,
  };
}

/** Unset parts are left out rather than written empty; the default sort is left out too. */
export function serialiseSearch({ storeId, range, filters }: SearchState): URLSearchParams {
  const entries: [string, string | number | undefined][] = [
    [P.store, storeId],
    [P.from, range?.startDate],
    [P.to, range?.endDate],
    [P.brand, filters.brandId],
    [P.model, filters.modelId],
    [P.type, filters.type],
    [P.gender, filters.gender],
    [P.level, filters.skillLevel],
    [P.minLength, filters.minLengthCm],
    [P.maxLength, filters.maxLengthCm],
    [P.maxPrice, filters.maxPricePerDay],
    [P.rating, filters.minRating],
    [P.sort, filters.sort === 'rating' ? undefined : filters.sort],
  ];

  return new URLSearchParams(
    entries
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}

/** The search request, once the customer has picked both a store and dates. */
export function searchInput({ storeId, range, filters }: SearchState): SkiSearchInput | null {
  return storeId && range ? { ...filters, storeId, ...range } : null;
}
