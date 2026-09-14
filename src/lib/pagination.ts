import { z } from 'zod';

// Tables are page-numbered; card grids load in batches (PLAN decision 10).

export const PAGE_SIZE = 10;

/** Four rows of the three-column grid. */
export const BATCH_SIZE = 12;

export const pageSchema = z.number().int().min(1).default(1);

/** How many items the client already has. Absent on the first request. */
export const cursorSchema = z.number().int().min(0).nullish();

export function skipForPage(page: number, size: number = PAGE_SIZE): number {
  return (page - 1) * size;
}

/** Never zero: an empty list is still page 1 of 1. */
export function pageCount(total: number, size: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Where the next batch starts, or null once everything has been sent. */
export function nextCursor(cursor: number, loaded: number, total: number): number | null {
  const seen = cursor + loaded;

  return seen < total ? seen : null;
}
