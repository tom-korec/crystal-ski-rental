import { type SkiListInput, skiListSchema } from '~/lib/ski-schema';

export type FleetFilters = Omit<SkiListInput, 'cursor'>;

const PARAMS = {
  inventoryCode: 'code',
  storeId: 'store',
  brandId: 'brand',
  modelId: 'model',
  type: 'type',
  gender: 'gender',
  skillLevel: 'level',
  minLengthCm: 'minLength',
  maxLengthCm: 'maxLength',
} as const satisfies Record<keyof FleetFilters, string>;

const NUMERIC = new Set<keyof FleetFilters>(['minLengthCm', 'maxLengthCm']);

/** Untrusted like any URL: each filter that does not pass the router's schema is dropped on its own. */
export function parseFleet(params: URLSearchParams): FleetFilters {
  const candidate = Object.fromEntries(
    (Object.entries(PARAMS) as [keyof FleetFilters, string][]).flatMap(([key, param]) => {
      const raw = params.get(param);
      if (raw === null || raw === '') return [];
      return [[key, NUMERIC.has(key) ? Number(raw) : raw]];
    }),
  );

  const parsed = skiListSchema.safeParse(candidate);
  if (parsed.success) return withoutCursor(parsed.data);

  const invalid = new Set(parsed.error.issues.map((issue) => String(issue.path[0])));
  const retried = skiListSchema.safeParse(
    Object.fromEntries(Object.entries(candidate).filter(([key]) => !invalid.has(key))),
  );
  return retried.success ? withoutCursor(retried.data) : {};
}

export function serialiseFleet(filters: FleetFilters): URLSearchParams {
  return new URLSearchParams(
    (Object.entries(PARAMS) as [keyof FleetFilters, string][]).flatMap(([key, param]) => {
      const value = filters[key];
      return value === undefined || value === '' ? [] : [[param, String(value)]];
    }),
  );
}

function withoutCursor({ cursor: _cursor, ...filters }: SkiListInput): FleetFilters {
  return filters;
}
