import { addDays, todayDateString } from '~/lib/date';
import { type SkiSearchInput, skiSearchSchema } from '~/lib/ski-schema';
import { SEARCH_PARAMS as P } from '~/lib/routes';

export type SearchFilters = SkiSearchInput & { sort: NonNullable<SkiSearchInput['sort']> };

/** A weekend-length rental starting tomorrow: a useful first question for someone just browsing. */
export function defaultRange() {
  const startDate = addDays(todayDateString(), 1);
  return { startDate, endDate: addDays(startDate, 2) };
}

function numberParam(params: URLSearchParams, name: string): number | undefined {
  const value = params.get(name);
  return value === null || value === '' ? undefined : Number(value);
}

/**
 * The URL is untrusted, so it goes through the router's own schema. Filters that do not survive are
 * dropped one by one, and dates that are no longer bookable fall back to the default window, rather than
 * leaving the page with nothing to show.
 */
export function parseSearch(params: URLSearchParams): SearchFilters {
  const candidate: Record<string, unknown> = {
    startDate: params.get(P.from) ?? undefined,
    endDate: params.get(P.to) ?? undefined,
    storeId: params.get(P.store) ?? undefined,
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

  const parsed = skiSearchSchema.safeParse(candidate);
  if (parsed.success) return { ...parsed.data, cursor: undefined };

  const invalid = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  const cleaned = Object.fromEntries(Object.entries(candidate).filter(([key]) => !invalid.has(key)));
  const dates = invalid.has('startDate') || invalid.has('endDate') ? defaultRange() : {};

  const retried = skiSearchSchema.safeParse({ ...cleaned, ...dates });
  return retried.success ? { ...retried.data, cursor: undefined } : { ...defaultRange(), sort: 'rating' };
}

/** Dates are always written; unset filters are left out rather than written empty. */
export function serialiseSearch(filters: SearchFilters): URLSearchParams {
  const entries: [string, string | number | undefined][] = [
    [P.from, filters.startDate],
    [P.to, filters.endDate],
    [P.store, filters.storeId],
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
      .map(([k, v]) => [k, String(v)]),
  );
}
