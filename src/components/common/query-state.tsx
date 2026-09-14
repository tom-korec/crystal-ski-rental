import type { ReactNode } from 'react';

import { FormError } from '~/components/common/form-error';

/** Structural, so plain and infinite queries both fit. */
export interface QueryLike<TData> {
  isPending: boolean;
  isError: boolean;
  error: { message: string } | null;
  data: TData | undefined;
}

interface QueryStateProps<TData> {
  query: QueryLike<TData>;
  skeleton: ReactNode;
  isEmpty?: (data: TData) => boolean;
  empty?: ReactNode;
  /** A render prop, so the loaded branch receives the data already narrowed. */
  children: (data: TData) => ReactNode;
}

/** The four states every list passes through: loading, failed, empty and loaded. */
export function QueryState<TData>({ query, skeleton, isEmpty, empty, children }: QueryStateProps<TData>) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <FormError message={query.error?.message} />;
  if (query.data === undefined) return null;
  if (isEmpty?.(query.data)) return <>{empty}</>;

  return <>{children(query.data)}</>;
}
